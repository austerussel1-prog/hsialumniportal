const express = require('express');
const Notification = require('../models/Notification');
const { verifyToken } = require('./auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 100);
    const recipientId = String(req.user?.id || req.user?._id || '').trim();
    if (!recipientId) {
      return res.status(401).json({ message: 'Invalid token user' });
    }

    const notifications = await Notification.find({ recipient: recipientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ notifications });
  } catch (err) {
    console.error('GET /api/notifications error', err);
    return res.status(500).json({ message: 'Failed to load notifications' });
  }
});

module.exports = router;