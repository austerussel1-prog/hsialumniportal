const mongoose = require('mongoose');

const featuredSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fullName: { type: String, default: '' },
    roleTitle: { type: String, default: '' },
    company: { type: String, default: '' },
    monthLabel: { type: String, default: '' },
    quote: { type: String, default: '' },
    badges: { type: [String], default: [] },
  },
  { _id: false }
);

const milestoneSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    date: { type: String, required: true },
  },
  { _id: false }
);

const appreciationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    excerpt: { type: String, default: '' },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const certificationEventSchema = new mongoose.Schema(
  {
    quantity: { type: Number, default: 0 },
    source: { type: String, default: 'award' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const awardEventSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    category: {
      type: String,
      enum: ['alumni', 'employee'],
      default: 'alumni',
    },
    fullName: { type: String, default: '' },
    roleTitle: { type: String, default: '' },
    company: { type: String, default: '' },
    monthLabel: { type: String, default: '' },
    quote: { type: String, default: '' },
    badges: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  }
);

const achievementSchema = new mongoose.Schema(
  {
    featured: { type: featuredSchema, default: null },
    badgeCatalog: { type: [String], default: [] },
    milestones: { type: [milestoneSchema], default: [] },
    appreciationPosts: { type: [appreciationSchema], default: [] },
    certificationEvents: { type: [certificationEventSchema], default: [] },
    awardEvents: { type: [awardEventSchema], default: [] },
    stats: {
      totalBadgesAwarded: { type: Number, default: 0 },
      featuredAlumni: { type: Number, default: 0 },
      appreciationPosts: { type: Number, default: 0 },
      activeAlumni: { type: Number, default: 0 },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', achievementSchema);
