const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestType: { type: String, required: true },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'fulfilled', 'rejected'], default: 'pending', index: true },
    fulfilledDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fulfilledAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
