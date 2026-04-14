const express = require('express');
const Notification = require('../models/Notification');
const { verifyToken } = require('./auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 100);
    const notifications = await Notification.find({ recipient: req.user.id })
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