const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorEmail: { type: String, default: '', index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: '', index: true },
    entityId: { type: String, default: '' },
    status: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
