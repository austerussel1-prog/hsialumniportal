const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  attended: { type: Boolean, default: false },
  decisionAt: { type: Date },
  decisionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String, default: '' },
  registeredAt: { type: Date, default: Date.now },
});

const feedbackSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  rating: { type: Number },
  comments: { type: String },
  submittedAt: { type: Date, default: Date.now },
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  isVirtual: { type: Boolean, default: false },
  location: { type: String },
  virtualLink: { type: String },
  imageUrl: { type: String },
  capacity: { type: Number },
  registrations: { type: [registrationSchema], default: [] },
  feedback: { type: [feedbackSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Event', eventSchema);
