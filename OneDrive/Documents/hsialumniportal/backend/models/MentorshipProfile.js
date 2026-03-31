const mongoose = require('mongoose');

const mentorshipProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    roles: {
      type: [String],
      enum: ['mentor', 'speaker'],
      default: ['mentor'],
    },
    expertise: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    yearsExperience: { type: Number, min: 0 },
    availabilityNote: { type: String, default: '' },
    bio: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

mentorshipProfileSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('MentorshipProfile', mentorshipProfileSchema);

