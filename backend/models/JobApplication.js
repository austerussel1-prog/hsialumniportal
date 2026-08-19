const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, default: '', trim: true },
    mobile: { type: String, default: '', trim: true },
    startDate: { type: String, default: '' },
    coverLetter: { type: String, default: '' },
    jobId: { type: String, default: '', trim: true, index: true },
    jobTitle: { type: String, default: '', trim: true },
    company: { type: String, default: '', trim: true },
    resumeFileName: { type: String, default: '' },
    resumeMimeType: { type: String, default: '' },
    resumeBuffer: { type: Buffer, default: null },
    status: { type: String, enum: ['pending', 'reviewed', 'approved', 'rejected'], default: 'pending', index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
