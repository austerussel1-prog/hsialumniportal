const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const Document = require('../models/Document');
const DocumentRequest = require('../models/DocumentRequest');
const User = require('../models/User');
const { verifyToken } = require('./auth');

const router = express.Router();

const ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'hr', 'alumni_officer'];

const ensureAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role').lean();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Failed to validate admin access' });
  }
};

const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, `${unique}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const resolveCategory = (originalName, explicit) => {
  const fromClient = String(explicit || '').trim().toLowerCase();
  if (fromClient === 'certificate') return 'certificate';
  if (fromClient === 'document') return 'document';
  const lower = String(originalName || '').toLowerCase();
  if (lower.includes('certificate') || lower.includes('certification')) return 'certificate';
  return 'document';
};

router.get('/_route_check', (req, res) => {
  return res.json({ ok: true, route: '/api/documents' });
});

router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [documentsCount, certificationsCount, requestsCount] = await Promise.all([
      Document.countDocuments({ owner: userId }),
      Document.countDocuments({ owner: userId, category: 'certificate' }),
      DocumentRequest.countDocuments({ requester: userId }),
    ]);

    return res.json({
      totalDocuments: documentsCount,
      certifications: certificationsCount,
      requestedDocuments: requestsCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load document stats' });
  }
});

router.get('/recent', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '6', 10) || 6, 1), 25);
    const docs = await Document.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id originalName url sizeBytes category createdAt')
      .lean();
    return res.json({ documents: docs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load recent documents' });
  }
});

router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const q = String(req.query.q || '').trim();
    const sort = String(req.query.sort || 'newest').toLowerCase();

    const filter = { owner: userId };
    if (q) {
      filter.originalName = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const sortSpec = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const docs = await Document.find(filter)
      .sort(sortSpec)
      .select('_id originalName url sizeBytes category createdAt')
      .lean();

    return res.json({ documents: docs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load documents' });
  }
});

router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const userId = req.user.id;
    const category = resolveCategory(req.file.originalname, req.body?.category);
    const url = `/uploads/documents/${req.file.filename}`;

    const doc = await Document.create({
      owner: userId,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      url,
      mimeType: req.file.mimetype || '',
      sizeBytes: req.file.size || 0,
      category,
    });

    return res.status(201).json({ message: 'Uploaded', document: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to upload document' });
  }
});

router.get('/download/:id', verifyToken, async (req, res) => {
  try {
    const docId = req.params.id;
    const doc = await Document.findById(docId).lean();
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const user = await User.findById(req.user.id).select('role').lean();
    const isAdmin = Boolean(user?.role && ADMIN_ROLES.includes(user.role));
    const isOwner = String(doc.owner) === String(req.user.id);
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

    const filePath = path.join(uploadsDir, doc.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server' });
    return res.download(filePath, doc.originalName);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to download document' });
  }
});

router.get('/requests', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await DocumentRequest.find({ requester: userId })
      .sort({ createdAt: -1 })
      .populate('fulfilledDocument', '_id originalName category sizeBytes createdAt')
      .select('_id requestType notes status createdAt fulfilledAt rejectedAt rejectionReason fulfilledDocument')
      .lean();
    return res.json({ requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load document requests' });
  }
});

router.post('/requests', verifyToken, async (req, res) => {
  try {
    const requestType = String(req.body?.requestType || '').trim();
    const notes = String(req.body?.notes || '').trim();
    if (!requestType) return res.status(400).json({ message: 'requestType is required' });

    const created = await DocumentRequest.create({
      requester: req.user.id,
      requestType,
      notes,
      status: 'pending',
    });
    return res.status(201).json({ message: 'Requested', request: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to request document' });
  }
});

router.get('/admin/requests', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim().toLowerCase();
    const filter = {};
    if (status && ['pending', 'fulfilled', 'rejected'].includes(status)) filter.status = status;

    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);

    const requests = await DocumentRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('requester', 'name email role')
      .populate('fulfilledDocument', '_id originalName category sizeBytes createdAt')
      .select('_id requester requestType notes status createdAt fulfilledAt rejectedAt rejectionReason fulfilledDocument')
      .lean();

    return res.json({ requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load admin requests' });
  }
});

router.post('/admin/requests/:id/fulfill', verifyToken, ensureAdmin, upload.single('file'), async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const request = await DocumentRequest.findById(requestId).lean();
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status === 'fulfilled') return res.status(409).json({ message: 'Request already fulfilled' });
    if (request.status === 'rejected') return res.status(409).json({ message: 'Rejected request cannot be fulfilled' });

    const category = resolveCategory(req.file.originalname, req.body?.category);
    const url = `/uploads/documents/${req.file.filename}`;

    const doc = await Document.create({
      owner: request.requester,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      url,
      mimeType: req.file.mimetype || '',
      sizeBytes: req.file.size || 0,
      category,
    });

    const updated = await DocumentRequest.findByIdAndUpdate(
      requestId,
      {
        status: 'fulfilled',
        fulfilledDocument: doc._id,
        fulfilledBy: req.user.id,
        fulfilledAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: '',
      },
      { new: true }
    ).lean();

    return res.json({ message: 'Fulfilled', request: updated, document: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fulfill request' });
  }
});

router.post('/admin/requests/:id/reject', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const requestId = req.params.id;
    const reason = String(req.body?.reason || '').trim();

    const request = await DocumentRequest.findById(requestId).lean();
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status === 'rejected') return res.status(409).json({ message: 'Request already rejected' });

    const updated = await DocumentRequest.findByIdAndUpdate(
      requestId,
      {
        status: 'rejected',
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      { new: true }
    ).lean();

    return res.json({ message: 'Rejected', request: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to reject request' });
  }
});

module.exports = router;
