const KPI = require('../models/KPI');
const User = require('../models/User');
const Event = require('../models/Event');
const VolunteerParticipation = require('../models/VolunteerParticipation');
const MentorshipSession = require('../models/MentorshipSession');
const Achievement = require('../models/Achievement');
const Message = require('../models/Message');
const Document = require('../models/Document');

// Initialize KPI record for new user
async function initializeUserKPI(userId, userRole = 'user') {
  try {
    let existingKPI = await KPI.findOne({ userId });
    if (existingKPI) {
      return existingKPI;
    }

    const userType = userRole === 'alumni' ? 'alumni' : 'employee';
    const kpi = new KPI({
      userId,
      userType,
    });

    await kpi.save();
    console.log(`KPI initialized for user ${userId}`);
    return kpi;
  } catch (error) {
    console.error(`Error initializing KPI for user ${userId}:`, error);
  }
}

// Refresh all user KPIs
async function refreshAllKPIs() {
  try {
    const users = await User.find({ status: 'approved' });
    const refreshPromises = users.map((user) => refreshUserKPI(user._id));
    await Promise.allSettled(refreshPromises);
    console.log('All KPIs refreshed successfully');
  } catch (error) {
    console.error('Error refreshing all KPIs:', error);
  }
}

// Refresh KPI for a specific user
async function refreshUserKPI(userId) {
  try {
    let kpi = await KPI.findOne({ userId });

    if (!kpi) {
      const user = await User.findById(userId);
      if (!user) {
        console.warn(`User ${userId} not found`);
        return null;
      }
      kpi = new KPI({
        userId,
        userType: user.role === 'alumni' ? 'alumni' : 'employee',
      });
    }

    // Recalculate metrics
    const [
      eventsAttended,
      eventsCreated,
      volunteerParticipations,
      mentorshipConducted,
      mentorshipAttended,
      badgesEarned,
      messagesSent,
      documentsShared,
    ] = await Promise.all([
      Event.countDocuments({ attendees: userId }),
      Event.countDocuments({ createdBy: userId }),
      VolunteerParticipation.countDocuments({ userId }),
      MentorshipSession.countDocuments({ mentorId: userId, status: 'completed' }),
      MentorshipSession.countDocuments({ menteeId: userId, status: 'completed' }),
      Achievement.countDocuments({ userId, awarded: true }),
      Message.countDocuments({ senderId: userId }),
      Document.countDocuments({ sharedWith: userId }),
    ]);

    kpi.eventsAttended = eventsAttended;
    kpi.eventsCreated = eventsCreated;
    kpi.volunteerParticipations = volunteerParticipations;
    kpi.mentorshipSessionsConducted = mentorshipConducted;
    kpi.mentorshipSessionsAttended = mentorshipAttended;
    kpi.badgesEarned = badgesEarned;
    kpi.messagesSent = messagesSent;
    kpi.documentsShared = documentsShared;

    // Calculate engagement score
    kpi.engagementScore = calculateEngagementScore(kpi);
    kpi.lastCalculatedAt = new Date();
    kpi.updatedAt = new Date();

    await kpi.save();
    return kpi;
  } catch (error) {
    console.error(`Error refreshing KPI for user ${userId}:`, error);
    return null;
  }
}

// Calculate engagement score
function calculateEngagementScore(kpi) {
  const weights = {
    eventsAttended: 5,
    eventsCreated: 10,
    jobsPosted: 15,
    jobApplications: 8,
    jobsPlacements: 20,
    volunteerHours: 10,
    volunteerParticipations: 8,
    mentorshipSessionsConducted: 15,
    mentorshipSessionsAttended: 10,
    badgesEarned: 8,
    certificationsCompleted: 12,
    messagesSent: 2,
    documentsShared: 5,
    trainingsCompleted: 10,
    loginCount: 1,
  };

  let score = 0;
  Object.keys(weights).forEach((key) => {
    score += (kpi[key] || 0) * weights[key];
  });

  // Normalize score to 0-100
  const maxScore = 1000;
  return Math.min(100, Math.round((score / maxScore) * 100));
}

// Update specific KPI metric
async function updateKPIMetric(userId, metricName, incrementValue = 1) {
  try {
    let kpi = await KPI.findOne({ userId });

    if (!kpi) {
      const user = await User.findById(userId);
      if (!user) {
        console.warn(`User ${userId} not found`);
        return null;
      }
      kpi = new KPI({
        userId,
        userType: user.role === 'alumni' ? 'alumni' : 'employee',
      });
    }

    // Update metric
    if (metricName in kpi) {
      kpi[metricName] = (kpi[metricName] || 0) + incrementValue;
    }

    // Recalculate engagement score
    kpi.engagementScore = calculateEngagementScore(kpi);
    kpi.updatedAt = new Date();

    await kpi.save();
    return kpi;
  } catch (error) {
    console.error(`Error updating KPI metric for user ${userId}:`, error);
    return null;
  }
}

module.exports = {
  initializeUserKPI,
  refreshAllKPIs,
  refreshUserKPI,
  updateKPIMetric,
  calculateEngagementScore,
};
