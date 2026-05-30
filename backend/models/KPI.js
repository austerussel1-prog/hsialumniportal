const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  userType: {
    type: String,
    enum: ['employee', 'alumni'],
    required: true,
  },
  // Event-related KPIs
  eventsAttended: {
    type: Number,
    default: 0,
  },
  eventsCreated: {
    type: Number,
    default: 0,
  },
  
  // Job-related KPIs
  jobsPosted: {
    type: Number,
    default: 0,
  },
  jobApplications: {
    type: Number,
    default: 0,
  },
  jobsPlacements: {
    type: Number,
    default: 0,
  },
  
  // Volunteer KPIs
  volunteerHours: {
    type: Number,
    default: 0,
  },
  volunteerOpportunitiesCreated: {
    type: Number,
    default: 0,
  },
  volunteerParticipations: {
    type: Number,
    default: 0,
  },
  
  // Mentorship KPIs
  mentorshipSessionsConducted: {
    type: Number,
    default: 0,
  },
  mentorshipSessionsAttended: {
    type: Number,
    default: 0,
  },
  
  // Achievement KPIs
  badgesEarned: {
    type: Number,
    default: 0,
  },
  certificationsCompleted: {
    type: Number,
    default: 0,
  },
  
  // Communication KPIs
  messagesSent: {
    type: Number,
    default: 0,
  },
  messagesReceived: {
    type: Number,
    default: 0,
  },
  
  // Document KPIs
  documentsShared: {
    type: Number,
    default: 0,
  },
  documentsDownloaded: {
    type: Number,
    default: 0,
  },
  
  // Training KPIs
  trainingsCompleted: {
    type: Number,
    default: 0,
  },
  trainingsInProgress: {
    type: Number,
    default: 0,
  },
  
  // General activity metrics
  loginCount: {
    type: Number,
    default: 0,
  },
  lastLoginDate: {
    type: Date,
    default: null,
  },
  
  // Engagement score (calculated based on all metrics)
  engagementScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Performance rating
  performanceRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  performanceRemarks: {
    type: String,
    default: '',
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastCalculatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for performance queries
kpiSchema.index({ engagementScore: -1 });
kpiSchema.index({ userType: 1, engagementScore: -1 });
kpiSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('KPI', kpiSchema);
