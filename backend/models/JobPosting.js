const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema(
  {
    category: { type: String, default: 'exclusive', index: true },
    company: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    type: { type: String, default: '' },
    status: { type: String, default: 'Open', index: true },
    applyLink: { type: String, default: '' },
    description: { type: String, default: '' },
    department: { type: String, default: 'General' },
    role: { type: String, default: 'Staff' },
    tag: { type: String, default: 'Standard' },
    workMode: { type: String, default: '' },
    experience: { type: String, default: '' },
    vacancies: { type: String, default: '' },
    salary: { type: String, default: '' },
    aboutCompany: { type: String, default: '' },
    jobDescription: { type: String, default: '' },
    requirements: { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model('JobPosting', jobPostingSchema);
