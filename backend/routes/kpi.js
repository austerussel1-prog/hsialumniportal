const express = require('express');
const KPI = require('../models/KPI');
const User = require('../models/User');
const Event = require('../models/Event');
const VolunteerParticipation = require('../models/VolunteerParticipation');
const MentorshipSession = require('../models/MentorshipSession');
const Achievement = require('../models/Achievement');
const Message = require('../models/Message');
const Document = require('../models/Document');
const JobApplication = require('../models/JobPosting');
const { verifyToken } = require('./auth');

const router = express.Router();

// Middleware to verify admin or token owner
async function verifyKpiAccess(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    const user = await User.findById(req.userId);
    
    // Allow if user is admin or requesting their own KPI
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      if (req.params.userId && req.params.userId !== req.userId.toString()) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Calculate engagement score based on all activities
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
  const maxScore = 1000; // Arbitrary maximum for normalization
  return Math.min(100, Math.round((score / maxScore) * 100));
}

// Get all KPIs (Admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, userType, sortBy = 'engagementScore', order = 'desc' } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sortField = ['engagementScore', 'performanceRating', 'createdAt'].includes(sortBy) 
      ? sortBy 
      : 'engagementScore';
    const sortOrder = order === 'asc' ? 1 : -1;

    const filter = {};
    if (userType && ['employee', 'alumni'].includes(userType)) {
      filter.userType = userType;
    }

    const total = await KPI.countDocuments(filter);
    const kpis = await KPI.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('userId', 'name email role');

    res.json({
      success: true,
      data: kpis,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KPI for a specific user
router.get('/user/:userId', verifyKpiAccess, async (req, res) => {
  try {
    const kpi = await KPI.findOne({ userId: req.params.userId })
      .populate('userId', 'name email role status');

    if (!kpi) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    res.json({
      success: true,
      data: kpi,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh KPI data (recalculate metrics from database)
router.post('/user/:userId/refresh', async (req, res) => {
  try {
    const userId = req.params.userId;
    let kpi = await KPI.findOne({ userId });

    if (!kpi) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
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

    res.json({
      success: true,
      message: 'KPI refreshed successfully',
      data: kpi,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update KPI (partial update)
router.patch('/user/:userId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const kpi = await KPI.findOne({ userId: req.params.userId });
    if (!kpi) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    const allowedFields = [
      'performanceRating',
      'performanceRemarks',
      'loginCount',
      'lastLoginDate',
    ];

    allowedFields.forEach((field) => {
      if (field in req.body) {
        kpi[field] = req.body[field];
      }
    });

    kpi.engagementScore = calculateEngagementScore(kpi);
    kpi.updatedAt = new Date();
    await kpi.save();

    res.json({
      success: true,
      message: 'KPI updated successfully',
      data: kpi,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KPI leaderboard
router.get('/leaderboard/:userType', async (req, res) => {
  try {
    const { userType } = req.params;
    const { limit = 20, metric = 'engagementScore' } = req.query;

    if (!['employee', 'alumni'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid userType' });
    }

    const validMetrics = [
      'engagementScore',
      'performanceRating',
      'eventsAttended',
      'jobsPlacements',
      'volunteerHours',
      'badgesEarned',
    ];
    const sortMetric = validMetrics.includes(metric) ? metric : 'engagementScore';

    const leaderboard = await KPI.find({ userType })
      .sort({ [sortMetric]: -1 })
      .limit(parseInt(limit, 10))
      .populate('userId', 'name email role');

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KPI statistics for dashboard
router.get('/stats/summary', async (req, res) => {
  try {
    const { userType } = req.query;
    const filter = userType && ['employee', 'alumni'].includes(userType)
      ? { userType }
      : {};

    const stats = await KPI.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgEngagementScore: { $avg: '$engagementScore' },
          maxEngagementScore: { $max: '$engagementScore' },
          minEngagementScore: { $min: '$engagementScore' },
          avgPerformanceRating: { $avg: '$performanceRating' },
          totalUsers: { $sum: 1 },
          totalBadgesEarned: { $sum: '$badgesEarned' },
          totalEventsAttended: { $sum: '$eventsAttended' },
          totalVolunteerHours: { $sum: '$volunteerHours' },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        avgEngagementScore: 0,
        maxEngagementScore: 0,
        minEngagementScore: 0,
        avgPerformanceRating: 0,
        totalUsers: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
