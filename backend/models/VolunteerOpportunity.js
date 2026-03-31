const mongoose = require('mongoose');

const volunteerOpportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    startAt: { type: Date },
    endAt: { type: Date },
    location: { type: String, default: '' },
    estimatedHours: { type: Number, min: 0 },
    status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

volunteerOpportunitySchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('VolunteerOpportunity', volunteerOpportunitySchema);

