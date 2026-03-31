const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 },
    category: { type: String, enum: ['document', 'certificate'], default: 'document', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);

