const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, default: 'general', index: true },
    source: { type: String, default: 'System' },
    title: { type: String, default: '' },
    message: { type: String, required: true },
    level: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    actionType: { type: String, default: 'route' },
    actionPath: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);