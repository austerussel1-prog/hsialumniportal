const mongoose = require('mongoose');

const feedbackReviewSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    feedbackType: {
      type: String,
      enum: ['alumni_feedback', 'program_evaluation', 'suggestion_improvement', 'website_nps'],
      required: true,
      index: true,
    },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    npsScore: { type: Number, min: 0, max: 10, default: null },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    program: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

feedbackReviewSchema.index({ createdAt: -1, feedbackType: 1 });

module.exports = mongoose.model('FeedbackReview', feedbackReviewSchema);
