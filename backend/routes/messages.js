const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const { verifyToken } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { decryptField, isEncryptedValue } = require('../utils/fieldEncryption');

const uploadsDir = path.join(__dirname, '..', 'uploads', 'messages');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const DEFAULT_TENOR_KEY = 'LIVDSRZULELA';
const BLOCKED_GIF_TERMS = [
  '18+',
  'adult',
  'ass',
  'bdsm',
  'bikini',
  'boob',
  'booty',
  'breast',
  'erotic',
  'fetish',
  'horny',
  'lingerie',
  'naked',
  'nude',
  'nsfw',
  'porn',
  'sexy',
  'sex',
  'twerk',
];

const storage = multer.diskStorage({
  destination: function destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function filename(req, file, cb) {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

function revealField(value) {
  if (value === null || typeof value === 'undefined') return value;
  const text = String(value);
  if (!isEncryptedValue(text)) return value;
  return decryptField(text);
}

function normalizeUserPublic(user) {
  if (!user) return null;
  const resolvedName = revealField(user.fullName) || revealField(user.name) || 'User';
  return {
    id: String(user._id || user.id || ''),
    fullName: resolvedName,
    name: revealField(user.name) || resolvedName,
    email: user.email || '',
    profileImage: revealField(user.profileImage) || '',
    jobTitle: user.jobTitle || '',
  };
}

const normalizeGifItem = (item, index) => {
  const media = item?.media_formats?.gif || item?.media_formats?.mediumgif || item?.media_formats?.tinygif || null;
  const preview = item?.media_formats?.tinygifpreview || item?.media_formats?.nanogifpreview || null;
  const url = media?.url || '';
  if (!url) return null;

  const title = String(item?.content_description || item?.title || 'GIF').trim();
  const combined = `${title} ${String(item?.tags || '')}`.toLowerCase();
  const isBlocked = BLOCKED_GIF_TERMS.some((term) => combined.includes(term));
  if (isBlocked) return null;

  return {
    id: String(item?.id || `${Date.now()}-${index}`),
    title: title || 'GIF',
    url,
    previewUrl: preview?.url || url,
  };
};

const handleGifSearch = async (req, res) => {
  try {
    const rawQuery = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    const mode = rawQuery ? 'search' : 'featured';
    const searchQuery = rawQuery.replace(/\s+/g, ' ').slice(0, 80);
    const endpoint = mode === 'search'
      ? 'https://tenor.googleapis.com/v2/search'
      : 'https://tenor.googleapis.com/v2/featured';

    const params = new URLSearchParams({
      key: process.env.TENOR_API_KEY || DEFAULT_TENOR_KEY,
      client_key: process.env.TENOR_CLIENT_KEY || 'hsi_alumni_portal',
      limit: '30',
      media_filter: 'gif,tinygif',
      contentfilter: 'high',
      locale: 'en_US',
      random: 'true',
    });

    if (mode === 'search' && searchQuery) {
      params.set('q', searchQuery);
    }

    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      const providerText = await response.text().catch(() => '');
      console.error('Tenor provider error:', response.status, providerText);
      return res.status(502).json({ error: 'Failed to fetch GIFs from provider.' });
    }

    const payload = await response.json();
    const normalized = (Array.isArray(payload?.results) ? payload.results : [])
      .map(normalizeGifItem)
      .filter(Boolean);

    res.json({ results: normalized });
  } catch (err) {
    console.error('GET /api/messages/search-gifs error:', err);
    res.status(500).json({ error: 'Failed to load GIFs.' });
  }
};

router.get('/gifs', verifyToken, handleGifSearch);
router.get('/search-gifs', verifyToken, handleGifSearch);

// Get recent conversations for current user
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = String(req.user.id);
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name fullName email profileImage jobTitle')
      .populate('recipient', 'name fullName email profileImage jobTitle');

    const seen = new Set();
    const conversations = [];

    for (const msg of messages) {
      const senderId = String(msg.sender?._id || msg.sender);
      const recipientId = String(msg.recipient?._id || msg.recipient);
      const otherUser = senderId === userId ? msg.recipient : msg.sender;
      const otherId = senderId === userId ? recipientId : senderId;

      if (!otherUser || seen.has(otherId)) continue;
      seen.add(otherId);

      conversations.push({
        participant: {
          ...normalizeUserPublic(otherUser),
          id: otherId,
        },
        lastMessage: msg.text || (msg.imageUrl ? 'Photo' : (msg.attachmentOriginalName || 'File')),
        lastMessageAt: msg.createdAt,
        lastMessageSenderId: senderId,
        lastMessageRecipientId: recipientId,
      });
    }

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// Get messages between current user and recipient
router.get('/:recipientId', verifyToken, async (req, res) => {
  try {
    const userId = String(req.user.id || '');
    const recipientId = String(req.params.recipientId || '');

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ error: 'Invalid conversation recipient.' });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ],
    }).sort({ createdAt: 1 });
    // populate sender and recipient so frontend can show names and avatars
    const populated = await Message.populate(messages, [
      { path: 'sender', select: 'name fullName profileImage' },
      { path: 'recipient', select: 'name fullName profileImage' },
    ]);
    const normalized = populated.map((item) => {
      const plain = item?.toObject ? item.toObject() : item;
      return {
        ...plain,
        sender: normalizeUserPublic(plain.sender),
        recipient: normalizeUserPublic(plain.recipient),
      };
    });
    res.json({ messages: normalized });
  } catch (err) {
    console.error('GET /api/messages/:recipientId error:', err);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// Send a message
router.post('/:recipientId', verifyToken, (req, res, next) => {
  upload.fields([{ name: 'attachment', maxCount: 1 }, { name: 'image', maxCount: 1 }])(req, res, function onUploadComplete(err) {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File must be 15MB or smaller.' });
      }
      return res.status(400).json({ error: 'File upload failed.' });
    }

    return res.status(400).json({ error: err.message || 'File upload failed.' });
  });
}, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipientId = req.params.recipientId;
    const rawText = typeof req.body?.text === 'string' ? req.body.text : '';
    const normalizedText = rawText.trim();
    const uploadedFile = req.files?.attachment?.[0] || req.files?.image?.[0] || null;

    const hasAttachment = Boolean(uploadedFile?.filename);
    const isImageAttachment = Boolean(uploadedFile?.mimetype && uploadedFile.mimetype.startsWith('image/'));
    if (!normalizedText && !hasAttachment) {
      return res.status(400).json({ error: 'Message must include text, an image, or a file.' });
    }

    const message = new Message({
      sender: userId,
      recipient: recipientId,
      text: normalizedText,
      imageUrl: hasAttachment && isImageAttachment ? `/uploads/messages/${uploadedFile.filename}` : '',
      imageMimeType: hasAttachment && isImageAttachment ? uploadedFile.mimetype || '' : '',
      imageOriginalName: hasAttachment && isImageAttachment ? uploadedFile.originalname || '' : '',
      attachmentUrl: hasAttachment ? `/uploads/messages/${uploadedFile.filename}` : '',
      attachmentMimeType: hasAttachment ? uploadedFile.mimetype || '' : '',
      attachmentOriginalName: hasAttachment ? uploadedFile.originalname || '' : '',
      attachmentSize: hasAttachment ? Number(uploadedFile.size || 0) : 0,
    });

    await message.save();
    const populated = await Message.findById(message._id)
      .populate('sender', 'name fullName profileImage')
      .populate('recipient', 'name fullName profileImage');
    const plain = populated?.toObject ? populated.toObject() : populated;
    res.json({
      message: {
        ...plain,
        sender: normalizeUserPublic(plain.sender),
        recipient: normalizeUserPublic(plain.recipient),
      },
    });
  } catch (err) {
    console.error('POST /api/messages/:recipientId error:', err);
    const validationError = err && err.name === 'ValidationError';
    const statusCode = validationError ? 400 : 500;
    const errorMessage =
      typeof err?.message === 'string' && err.message.trim()
        ? err.message
        : 'Failed to send message.';
    res.status(statusCode).json({ error: errorMessage });
  }
});

module.exports = router;
