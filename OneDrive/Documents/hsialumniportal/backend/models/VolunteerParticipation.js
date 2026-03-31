const mongoose = require('mongoose');

const volunteerParticipationSchema = new mongoose.Schema(
  {
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'VolunteerOpportunity', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['volunteer', 'speaker'], default: 'volunteer' },
    status: { type: String, enum: ['applied', 'approved', 'rejected', 'attended'], default: 'applied', index: true },
    hoursLogged: { type: Number, min: 0 },
    notes: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

volunteerParticipationSchema.index({ opportunity: 1, user: 1 }, { unique: true });

volunteerParticipationSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('VolunteerParticipation', volunteerParticipationSchema);

