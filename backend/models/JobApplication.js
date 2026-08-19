const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    mobile: { type: String, default: '' },
    startDate: { type: String, default: '' },
    coverLetter: { type: String, default: '' },
    jobPostingId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', index: true },
    jobTitle: { type: String, default: '' },
    company: { type: String, default: '' },
    resumePath: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
