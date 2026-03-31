const mongoose = require('mongoose');

const volunteerLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    category: { type: String, default: '' },
    date: { type: Date, required: true, index: true },
    hours: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

volunteerLogSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('VolunteerLog', volunteerLogSchema);

