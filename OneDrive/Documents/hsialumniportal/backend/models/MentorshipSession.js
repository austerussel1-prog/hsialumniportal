const mongoose = require('mongoose');

const mentorshipSessionSchema = new mongoose.Schema(
  {
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    mode: { type: String, enum: ['virtual', 'onsite'], default: 'virtual' },
    location: { type: String, default: '' },
    meetingLink: { type: String, default: '' },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'declined', 'cancelled', 'completed'],
      default: 'requested',
      index: true,
    },
    respondedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

mentorshipSessionSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('MentorshipSession', mentorshipSessionSchema);

