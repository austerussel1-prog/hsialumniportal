const express = require('express');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { touchUserActivity } = require('../utils/userActivity');
const { uploadLocalFile, cleanupLocalFile } = require('../services/mediaStorage');

const router = express.Router();

// ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({ storage });
const MAX_ANNOUNCEMENT_VIDEO_BYTES = 100 * 1024 * 1024;

// Middleware to verify user and attach user to req
const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // debug: log whether Authorization header present
    console.log('verifyUser auth header:', !!authHeader);
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid user' });
    if (user.isDeleted) return res.status(403).json({ message: 'This account is scheduled for deletion and can no longer be used.' });
    touchUserActivity(user._id).catch(() => {});
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check admin
const verifyAdmin = (req, res, next) => {
  if (!['super_admin', 'admin', 'hr', 'alumni_officer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admins only' });
  }
  next();
};

// Create announcement (admin only)
// allow optional single media upload via 'media' field
router.post('/', verifyUser, verifyAdmin, (req, res, next) => {
  upload.single('media')(req, res, function (err) {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ message: 'Upload failed', error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('POST /api/announcements handler - req.body keys:', Object.keys(req.body || {}));
    console.log('POST /api/announcements handler - req.file present:', !!req.file, req.file && { originalname: req.file.originalname, mimetype: req.file.mimetype, filename: req.file.filename });
    const { title = '', content = '', mediaType, category = 'Company News' } = req.body;
    const announcement = new Announcement({
      author: req.user._id,
      title,
      content
    });

    if (req.file) {
      // determine kind: prefer explicit mediaType, otherwise infer from mimetype
      let kind = 'image';
      if (mediaType && ['image', 'video'].includes(mediaType)) kind = mediaType;
      else if (req.file.mimetype && req.file.mimetype.startsWith('video')) kind = 'video';

      if (kind === 'video' && Number(req.file.size || 0) > MAX_ANNOUNCEMENT_VIDEO_BYTES) {
        cleanupLocalFile(req.file.path);
        return res.status(400).json({ message: 'Video is too large. Please upload a file smaller than 100 MB.' });
      }

      let url = `/uploads/${req.file.filename}`;
      let uploadSucceeded = false;
      try {
        const uploadedUrl = await uploadLocalFile(req.file.path, { folder: 'announcements', resourceType: kind });
        if (uploadedUrl) {
          url = uploadedUrl;
          uploadSucceeded = true;
          cleanupLocalFile(req.file.path);
        }
      } catch (uploadErr) {
        console.error('Announcement media cloud upload failed:', uploadErr.message);
        if (uploadErr?.http_code === 400 && String(uploadErr?.message || '').includes('Max: 104857600')) {
          cleanupLocalFile(req.file.path);
          return res.status(400).json({ message: 'Video is too large. Please upload a file smaller than 100 MB.' });
        }
      }
      if (!uploadSucceeded && process.env.NODE_ENV === 'production') {
        cleanupLocalFile(req.file.path);
        return res.status(500).json({ message: 'Failed to store announcement media. Please try again.' });
      }
      announcement.attachments = announcement.attachments || [];
      announcement.attachments.push({ kind, url });
    }

    // set category if provided
    if (category) announcement.category = category;

    await announcement.save();
    res.status(201).json(announcement);
  } catch (err) {
    console.error('Create announcement error', err);
    res.status(500).json({ message: 'Failed to create announcement', error: err.message });
  }
});

// Get all announcements (latest first)
// Hide announcements for regular users until an admin-created announcement exists
router.get('/', verifyUser, async (req, res) => {
  try {
    // Check if any announcement was created by an admin/super_admin
    const items = await Announcement.find().populate('author', 'role').limit(50).lean();
    const hasAdminCreated = items.some(a => a.author && (a.author.role === 'admin' || a.author.role === 'super_admin'));

    // If no admin-created announcement exists, return empty array to non-admin users
    if (!hasAdminCreated && !['admin', 'super_admin', 'hr', 'alumni_officer'].includes(req.user.role)) {
      return res.json([]);
    }

    // Otherwise return full announcements list populated as before
    const announcements = await Announcement.find()
      .populate('author', 'name fullName role profileImage jobTitle')
      .populate('comments.user', 'name fullName profileImage jobTitle')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    console.error('GET /api/announcements error', err);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

// Public announcements (no auth) - useful for public widgets or testing
router.get('/public', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('author', 'name fullName role profileImage jobTitle')
      .populate('comments.user', 'name fullName profileImage jobTitle')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

// Heart/unheart an announcement
router.post('/:id/heart', verifyUser, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Not found' });
    const userId = req.user._id;
    const index = announcement.hearts.indexOf(userId);
    if (index === -1) {
      announcement.hearts.push(userId);
    } else {
      announcement.hearts.splice(index, 1);
    }
    await announcement.save();
    res.json({ hearts: announcement.hearts.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to heart announcement' });
  }
});

// Comment on an announcement
router.post('/:id/comment', verifyUser, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Not found' });
    const { text } = req.body;
    announcement.comments.push({ user: req.user._id, text });
    await announcement.save();
    await announcement.populate('comments.user', 'name fullName profileImage jobTitle');
    res.json(announcement.comments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to comment' });
  }
});

// Delete an announcement (author or admin)
router.delete('/:id', verifyUser, async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`DELETE /api/announcements/${id} by user ${req.user?._id} (role=${req.user?.role})`);

    const announcement = await Announcement.findById(id).populate('author');
    if (!announcement) {
      console.warn('Announcement not found for id', id);
      return res.status(404).json({ message: 'Not found' });
    }

    // allow delete if author or admin roles
    const authorId = announcement.author && (announcement.author._id || announcement.author);
    const isAuthor = String(authorId) === String(req.user._id);
    const isAdmin = ['super_admin', 'admin', 'hr', 'alumni_officer'].includes(req.user.role);
    console.log('Announcement author:', authorId, 'isAuthor:', isAuthor, 'isAdmin:', isAdmin);
    if (!isAuthor && !isAdmin) {
      console.warn('Forbidden delete attempt by', req.user._id);
      return res.status(403).json({ message: 'Forbidden' });
    }

    // delete and return deleted doc
    const deleted = await Announcement.findByIdAndDelete(id);
    if (!deleted) {
      console.error('Failed to delete announcement (findByIdAndDelete returned null)', id);
      return res.status(500).json({ message: 'Failed to delete announcement' });
    }
    console.log('Announcement deleted', id);
    res.json({ message: 'Announcement deleted', id });
  } catch (err) {
    console.error('Delete announcement error', err);
    res.status(500).json({ message: 'Failed to delete announcement', error: err.message });
  }
});

module.exports = router;

// Temporary debug route (remove in production)
// GET /api/announcements/debug/info
router.get('/debug/info', verifyUser, async (req, res) => {
  try {
    const items = await Announcement.find().limit(10).select('_id title author createdAt').populate('author', 'name');
    res.json({ user: { id: req.user._id, name: req.user.name, role: req.user.role }, announcements: items });
  } catch (err) {
    console.error('Debug route error', err);
    res.status(500).json({ message: 'Debug failed', error: err.message });
  }
});
