const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const MentorshipProfile = require('../models/MentorshipProfile');
const MentorshipSession = require('../models/MentorshipSession');
const VolunteerOpportunity = require('../models/VolunteerOpportunity');
const VolunteerParticipation = require('../models/VolunteerParticipation');
const VolunteerLog = require('../models/VolunteerLog');
const { verifyToken } = require('./auth');
const { decryptField, isEncryptedValue } = require('../utils/fieldEncryption');

const router = express.Router();

const ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'hr', 'alumni_officer'];

const ensureAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Failed to validate admin access' });
  }
};

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function decryptMaybe(value) {
  if (value === null || typeof value === 'undefined') return '';
  const raw = String(value);
  if (!raw) return '';
  if (!isEncryptedValue(raw)) return raw;
  return decryptField(raw);
}

function sanitizeUserProfile(user) {
  if (!user || typeof user !== 'object') return user;

  return {
    ...user,
    name: decryptMaybe(user.name),
    email: decryptMaybe(user.email),
    jobTitle: decryptMaybe(user.jobTitle),
    company: decryptMaybe(user.company),
    profileImage: decryptMaybe(user.profileImage),
  };
}

router.get('/_route_check', (req, res) => {
  res.json({ ok: true, router: 'mentorship' });
});

// ------------------------
// Mentor/Speaker sign-up
// ------------------------

router.get('/mentors', verifyToken, async (req, res) => {
  try {
    const profiles = await MentorshipProfile.find({ status: 'approved' })
      .populate('user', 'name jobTitle company profileImage')
      .lean();

    const mentorIds = profiles.map((p) => p.user?._id).filter(Boolean);
    const completedCounts = mentorIds.length
      ? await MentorshipSession.aggregate([
        { $match: { mentor: { $in: mentorIds.map((id) => new mongoose.Types.ObjectId(id)) }, status: 'completed' } },
        { $group: { _id: '$mentor', count: { $sum: 1 } } },
      ])
      : [];

    const completedMap = new Map(completedCounts.map((x) => [String(x._id), x.count]));

    const mentors = profiles
      .filter((p) => p.user)
      .map((p) => {
        const user = p.user;
        const sessionsCompleted = completedMap.get(String(user._id)) || 0;
        const primaryRole = Array.isArray(p.roles) && p.roles.includes('speaker') ? 'Speaker' : 'Mentor';
        const years = typeof p.yearsExperience === 'number' ? p.yearsExperience : null;
        const name = decryptMaybe(user.name);
        const jobTitle = decryptMaybe(user.jobTitle);
        const company = decryptMaybe(user.company);
        const profileImage = decryptMaybe(user.profileImage);
        return {
          id: String(user._id),
          name,
          title: [jobTitle, company].filter(Boolean).join(' - '),
          image: profileImage || '',
          badge: primaryRole,
          sessions: `${sessionsCompleted} sessions`,
          experience: years == null ? '' : `${years}+ years`,
          roles: Array.isArray(p.roles) ? p.roles : [],
          expertise: Array.isArray(p.expertise) ? p.expertise : [],
          topics: Array.isArray(p.topics) ? p.topics : [],
          availabilityNote: p.availabilityNote || '',
          bio: p.bio || '',
        };
      });

    res.json({ mentors });
  } catch (err) {
    console.error('GET /api/mentorship/mentors error', err);
    res.status(500).json({ message: 'Failed to fetch mentors' });
  }
});

router.get('/me/profile', verifyToken, async (req, res) => {
  try {
    const profile = await MentorshipProfile.findOne({ user: req.user.id }).lean();
    res.json({ profile: profile || null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

router.post('/applications', verifyToken, async (req, res) => {
  try {
    const payload = req.body || {};
    const roles = normalizeStringArray(payload.roles);
    const normalizedRoles = roles.length ? Array.from(new Set(roles.map((r) => String(r).toLowerCase()))).filter((r) => ['mentor', 'speaker'].includes(r)) : ['mentor'];

    const update = {
      roles: normalizedRoles,
      expertise: normalizeStringArray(payload.expertise),
      topics: normalizeStringArray(payload.topics),
      yearsExperience: payload.yearsExperience == null || payload.yearsExperience === '' ? undefined : Number(payload.yearsExperience),
      availabilityNote: String(payload.availabilityNote || ''),
      bio: String(payload.bio || ''),
      status: 'pending',
      reviewedBy: undefined,
      reviewedAt: undefined,
    };

    let profile = await MentorshipProfile.findOne({ user: req.user.id });
    if (!profile) {
      profile = new MentorshipProfile({ user: req.user.id, ...update });
    } else {
      Object.assign(profile, update);
    }

    await profile.save();
    res.status(201).json({ message: 'Application submitted', profile });
  } catch (err) {
    console.error('POST /api/mentorship/applications error', err);
    if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
      return res.status(400).json({ message: err.message || 'Invalid application data' });
    }
    res.status(500).json({ message: 'Failed to submit application' });
  }
});

router.get('/admin/applications', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'pending').toLowerCase();
    const query = ['pending', 'approved', 'rejected'].includes(status) ? { status } : {};
    const applications = await MentorshipProfile.find(query)
      .populate('user', 'name email jobTitle company profileImage')
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      applications: applications.map((application) => ({
        ...application,
        user: sanitizeUserProfile(application.user),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

router.post('/admin/applications/:id/approve', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const profile = await MentorshipProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Application not found' });
    profile.status = 'approved';
    profile.reviewedBy = req.adminUser._id;
    profile.reviewedAt = new Date();
    await profile.save();
    res.json({ message: 'Approved', profile });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve application' });
  }
});

router.post('/admin/applications/:id/reject', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const profile = await MentorshipProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Application not found' });
    profile.status = 'rejected';
    profile.reviewedBy = req.adminUser._id;
    profile.reviewedAt = new Date();
    await profile.save();
    res.json({ message: 'Rejected', profile });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject application' });
  }
});

// ------------------------
// Mentor scheduling
// ------------------------

router.post('/sessions', verifyToken, async (req, res) => {
  try {
    const payload = req.body || {};
    const mentorUserId = String(payload.mentorUserId || '');
    if (!mentorUserId) return res.status(400).json({ message: 'mentorUserId is required' });

    const startAt = toDateOrNull(payload.startAt);
    const endAt = toDateOrNull(payload.endAt);
    if (!startAt || !endAt) return res.status(400).json({ message: 'startAt and endAt are required' });
    if (endAt <= startAt) return res.status(400).json({ message: 'endAt must be after startAt' });

    const mentorProfile = await MentorshipProfile.findOne({ user: mentorUserId, status: 'approved' }).select('_id').lean();
    if (!mentorProfile) return res.status(400).json({ message: 'Selected mentor is not available for scheduling' });

    const mode = String(payload.mode || 'virtual').toLowerCase() === 'onsite' ? 'onsite' : 'virtual';
    const session = new MentorshipSession({
      mentor: mentorUserId,
      mentee: req.user.id,
      startAt,
      endAt,
      mode,
      location: String(payload.location || ''),
      meetingLink: String(payload.meetingLink || ''),
      message: String(payload.message || ''),
      status: 'requested',
    });

    await session.save();
    res.status(201).json({ message: 'Session requested', session });
  } catch (err) {
    console.error('POST /api/mentorship/sessions error', err);
    if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
      return res.status(400).json({ message: err.message || 'Invalid session data' });
    }
    res.status(500).json({ message: 'Failed to request session' });
  }
});

router.get('/me/sessions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await MentorshipSession.find({ $or: [{ mentor: userId }, { mentee: userId }] })
      .populate('mentor', 'name email jobTitle company profileImage')
      .populate('mentee', 'name email jobTitle company profileImage')
      .sort({ startAt: -1 })
      .lean();
    res.json({
      sessions: sessions.map((session) => ({
        ...session,
        mentor: sanitizeUserProfile(session.mentor),
        mentee: sanitizeUserProfile(session.mentee),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

router.post('/sessions/:id/respond', verifyToken, async (req, res) => {
  try {
    const action = String(req.body?.action || '').toLowerCase();
    const allowed = ['accept', 'decline', 'cancel', 'complete'];
    if (!allowed.includes(action)) return res.status(400).json({ message: 'Invalid action' });

    const session = await MentorshipSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const userId = String(req.user.id);
    const isMentor = String(session.mentor) === userId;
    const isMentee = String(session.mentee) === userId;
    if (!isMentor && !isMentee) return res.status(403).json({ message: 'Not allowed' });

    if (action === 'accept' || action === 'decline' || action === 'complete') {
      if (!isMentor) return res.status(403).json({ message: 'Only the mentor can perform this action' });
    }

    if (action === 'accept') session.status = 'accepted';
    if (action === 'decline') session.status = 'declined';
    if (action === 'cancel') session.status = 'cancelled';
    if (action === 'complete') session.status = 'completed';

    session.respondedAt = new Date();
    await session.save();

    res.json({ message: 'Updated', session });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update session' });
  }
});

// ------------------------
// Volunteer & outreach
// ------------------------

router.get('/volunteer/opportunities', verifyToken, async (req, res) => {
  try {
    const status = String(req.query.status || 'active').toLowerCase();
    const query = ['active', 'closed'].includes(status) ? { status } : {};
    const opportunities = await VolunteerOpportunity.find(query).sort({ startAt: 1, createdAt: -1 }).lean();
    res.json({ opportunities });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch opportunities' });
  }
});

router.post('/volunteer/opportunities', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.title) return res.status(400).json({ message: 'title is required' });
    const opportunity = new VolunteerOpportunity({
      title: String(payload.title),
      description: String(payload.description || ''),
      category: String(payload.category || ''),
      startAt: toDateOrNull(payload.startAt) || undefined,
      endAt: toDateOrNull(payload.endAt) || undefined,
      location: String(payload.location || ''),
      estimatedHours: payload.estimatedHours == null || payload.estimatedHours === '' ? undefined : Number(payload.estimatedHours),
      status: String(payload.status || 'active').toLowerCase() === 'closed' ? 'closed' : 'active',
      createdBy: req.adminUser._id,
    });
    await opportunity.save();
    res.status(201).json({ message: 'Created', opportunity });
  } catch (err) {
    if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
      return res.status(400).json({ message: err.message || 'Invalid opportunity data' });
    }
    res.status(500).json({ message: 'Failed to create opportunity' });
  }
});

router.post('/volunteer/opportunities/:id/close', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });
    opportunity.status = 'closed';
    await opportunity.save();
    res.json({ message: 'Closed', opportunity });
  } catch (err) {
    res.status(500).json({ message: 'Failed to close opportunity' });
  }
});

router.post('/volunteer/opportunities/:id/reopen', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });
    opportunity.status = 'active';
    await opportunity.save();
    res.json({ message: 'Reopened', opportunity });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reopen opportunity' });
  }
});

router.post('/volunteer/opportunities/:id/apply', verifyToken, async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id).lean();
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });
    if (opportunity.status !== 'active') return res.status(400).json({ message: 'Opportunity is closed' });

    const role = String(req.body?.role || 'volunteer').toLowerCase() === 'speaker' ? 'speaker' : 'volunteer';
    const notes = String(req.body?.notes || '');

    const participation = await VolunteerParticipation.findOneAndUpdate(
      { opportunity: opportunity._id, user: req.user.id },
      { $setOnInsert: { role, notes, status: 'applied', createdAt: new Date() } },
      { new: true, upsert: true }
    );

    res.status(201).json({ message: 'Applied', participation });
  } catch (err) {
    console.error('POST /api/mentorship/volunteer/opportunities/:id/apply error', err);
    if (err && err.code === 11000) {
      return res.status(200).json({ message: 'Already applied' });
    }
    res.status(500).json({ message: 'Failed to apply' });
  }
});

router.get('/volunteer/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const participations = await VolunteerParticipation.find({ user: userId })
      .populate('opportunity')
      .sort({ createdAt: -1 })
      .lean();
    const totalHours = participations.reduce((sum, p) => sum + (p.status === 'attended' ? Number(p.hoursLogged || 0) : 0), 0);
    res.json({ participations, totalHours });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch participation' });
  }
});

router.get('/volunteer/admin/participations', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'applied').toLowerCase();
    const query = ['applied', 'approved', 'rejected', 'attended'].includes(status) ? { status } : {};
    const participations = await VolunteerParticipation.find(query)
      .populate('opportunity')
      .populate('user', 'name email jobTitle company profileImage')
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      participations: participations.map((participation) => ({
        ...participation,
        user: sanitizeUserProfile(participation.user),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch participations' });
  }
});

router.post('/volunteer/admin/participations/:id/approve', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const participation = await VolunteerParticipation.findById(req.params.id);
    if (!participation) return res.status(404).json({ message: 'Participation not found' });
    participation.status = 'approved';
    participation.reviewedBy = req.adminUser._id;
    participation.reviewedAt = new Date();
    await participation.save();
    res.json({ message: 'Approved', participation });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve participation' });
  }
});

router.post('/volunteer/admin/participations/:id/reject', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const participation = await VolunteerParticipation.findById(req.params.id);
    if (!participation) return res.status(404).json({ message: 'Participation not found' });
    participation.status = 'rejected';
    participation.reviewedBy = req.adminUser._id;
    participation.reviewedAt = new Date();
    await participation.save();
    res.json({ message: 'Rejected', participation });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject participation' });
  }
});

router.post('/volunteer/admin/participations/:id/mark-attended', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const participation = await VolunteerParticipation.findById(req.params.id).populate('opportunity');
    if (!participation) return res.status(404).json({ message: 'Participation not found' });

    const explicitHours = req.body?.hours == null || req.body?.hours === '' ? null : Number(req.body.hours);
    const fallback = participation.opportunity?.estimatedHours;
    const hours = explicitHours == null || Number.isNaN(explicitHours) ? fallback : explicitHours;
    participation.status = 'attended';
    participation.hoursLogged = hours == null || Number.isNaN(Number(hours)) ? 0 : Number(hours);
    participation.reviewedBy = req.adminUser._id;
    participation.reviewedAt = new Date();
    await participation.save();
    res.json({ message: 'Marked attended', participation });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark attended' });
  }
});

// Volunteer logs (self-reported hours)

router.post('/volunteer/logs', verifyToken, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.title) return res.status(400).json({ message: 'title is required' });
    const date = toDateOrNull(payload.date);
    if (!date) return res.status(400).json({ message: 'date is required' });
    const hours = payload.hours == null || payload.hours === '' ? null : Number(payload.hours);
    if (hours == null || Number.isNaN(hours) || hours < 0) return res.status(400).json({ message: 'hours is required' });

    const log = new VolunteerLog({
      user: req.user.id,
      title: String(payload.title),
      category: String(payload.category || ''),
      date,
      hours,
      notes: String(payload.notes || ''),
      status: 'pending',
    });
    await log.save();
    res.status(201).json({ message: 'Logged', log });
  } catch (err) {
    if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
      return res.status(400).json({ message: err.message || 'Invalid log data' });
    }
    res.status(500).json({ message: 'Failed to create log' });
  }
});

router.get('/volunteer/me/logs', verifyToken, async (req, res) => {
  try {
    const logs = await VolunteerLog.find({ user: req.user.id }).sort({ date: -1, createdAt: -1 }).lean();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

router.get('/volunteer/me/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const attendedHoursAgg = await VolunteerParticipation.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), status: 'attended' } },
      { $group: { _id: null, hours: { $sum: '$hoursLogged' } } },
    ]);
    const attendedHours = attendedHoursAgg?.[0]?.hours || 0;

    const approvedLogHoursAgg = await VolunteerLog.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), status: 'approved' } },
      { $group: { _id: null, hours: { $sum: '$hours' } } },
    ]);
    const approvedLogHours = approvedLogHoursAgg?.[0]?.hours || 0;

    res.json({
      totals: {
        attendedOpportunityHours: attendedHours,
        approvedSelfReportedHours: approvedLogHours,
        totalVolunteerHours: attendedHours + approvedLogHours,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

router.get('/volunteer/admin/logs', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'pending').toLowerCase();
    const query = ['pending', 'approved', 'rejected'].includes(status) ? { status } : {};
    const logs = await VolunteerLog.find(query)
      .populate('user', 'name email jobTitle company profileImage')
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      logs: logs.map((log) => ({
        ...log,
        user: sanitizeUserProfile(log.user),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

router.post('/volunteer/admin/logs/:id/approve', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const log = await VolunteerLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    log.status = 'approved';
    log.reviewedBy = req.adminUser._id;
    log.reviewedAt = new Date();
    await log.save();
    res.json({ message: 'Approved', log });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve log' });
  }
});

router.post('/volunteer/admin/logs/:id/reject', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const log = await VolunteerLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    log.status = 'rejected';
    log.reviewedBy = req.adminUser._id;
    log.reviewedAt = new Date();
    await log.save();
    res.json({ message: 'Rejected', log });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject log' });
  }
});

module.exports = router;

