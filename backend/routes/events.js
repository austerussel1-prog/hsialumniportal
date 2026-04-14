const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendEventFeedbackEmail } = require('../services/emailService');
const { touchUserActivity } = require('../utils/userActivity');
const { uploadLocalFile, cleanupLocalFile } = require('../services/mediaStorage');
const {
  buildActiveEventsQuery,
  cleanupExpiredEvents,
  isEventExpired,
  processExpiredEvent,
} = require('../services/eventLifecycleService');
const { createUserNotification } = require('../services/userNotificationService');

const PORTAL_TIMEZONE_OFFSET = String(process.env.PORTAL_TIMEZONE_OFFSET || '+08:00').trim() || '+08:00';

function normalizeEventDateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;

  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const isDateTimeWithoutTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(raw);

  const normalized = !hasExplicitTimezone && isDateTimeWithoutTimezone
    ? `${raw}${PORTAL_TIMEZONE_OFFSET}`
    : raw;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

// ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({ storage });

// Middleware to verify user and attach user to req
const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid user' });
    if (user.isDeleted) return res.status(403).json({ message: 'This account is scheduled for deletion and can no longer be used.' });
    touchUserActivity(user._id).catch(() => {});
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check admin
const verifyAdmin = (req, res, next) => {
  if (!['super_admin', 'admin', 'hr', 'alumni_officer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admins only' });
  }
  next();
};

const resolveOptionalAuthenticatedUser = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id isDeleted').lean();
    if (!user || user.isDeleted) return null;
    return user;
  } catch {
    return null;
  }
};

// List all events
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    await cleanupExpiredEvents('events:list');
    const events = await Event.find(buildActiveEventsQuery(now)).sort({ startDate: 1 }).lean();
    res.json(events);
  } catch (err) {
    console.error('GET /api/events error', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// Route check (useful for debugging deployments/restarts)
router.get('/_route_check', (req, res) => {
  res.json({ ok: true, router: 'events', hasDelete: true });
});

// Get a single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (event && isEventExpired(event)) {
      await processExpiredEvent(event, 'events:get');
      return res.status(404).json({ message: 'Event not found' });
    }
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    console.error('GET /api/events/:id error', err);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
});

// Create an event (admin only)
// allow optional single image upload via 'image' field (multipart/form-data)
router.post('/', verifyUser, verifyAdmin, (req, res, next) => {
  if (!req.is('multipart/form-data')) return next();
  upload.single('image')(req, res, function (err) {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ message: 'Upload failed', error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const payload = req.body || {};
    const title = String(payload.title || '').trim();
    const description = String(payload.description || '').trim();
    const startDate = normalizeEventDateInput(payload.startDate);
    const endDate = normalizeEventDateInput(payload.endDate);
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!startDate) {
      return res.status(400).json({ message: 'Valid start date is required' });
    }
    if (description.length < 100) {
      return res.status(400).json({ message: 'Description must be at least 100 characters' });
    }
    if (endDate && endDate.getTime() < startDate.getTime()) {
      return res.status(400).json({ message: 'End date must be the same as or later than the start date' });
    }

    const isVirtual = String(payload.isVirtual || '').toLowerCase() === 'true' || payload.isVirtual === true || payload.isVirtual === 'on';
    const capacity = payload.capacity === '' || payload.capacity == null ? undefined : Number(payload.capacity);
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : payload.imageUrl;
    if (req.file) {
      try {
        const uploadedUrl = await uploadLocalFile(req.file.path, { folder: 'events', resourceType: 'image' });
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          cleanupLocalFile(req.file.path);
        }
      } catch (uploadErr) {
        console.error('Event image cloud upload failed:', uploadErr.message);
      }
    }
    // allow admin to set virtual/onsite via isVirtual boolean, location or virtualLink
    const event = new Event({
      title,
      description,
      category: payload.category,
      startDate,
      endDate,
      isVirtual,
      location: payload.location,
      virtualLink: payload.virtualLink,
      imageUrl,
      capacity,
      createdBy: req.user._id
    });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error('POST /api/events error', err);
    if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
      return res.status(400).json({ message: err.message || 'Invalid event data' });
    }
    res.status(500).json({ message: 'Failed to create event' });
  }
});

// Delete an event (admin only)
router.delete('/:id', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('DELETE /api/events/:id error', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// Register for an event
router.post('/:id/register', async (req, res) => {
  try {
    const authUser = await resolveOptionalAuthenticatedUser(req);
    if (!authUser?._id) return res.status(401).json({ message: 'Please log in to register for this event' });

    const accountUser = await User.findById(authUser._id).select('name email isDeleted').lean({ getters: true });
    if (!accountUser || accountUser.isDeleted) return res.status(401).json({ message: 'Invalid user' });

    const submittedName = String(req.body?.name || '').trim();
    const name = submittedName || String(accountUser?.name || '').trim();
    const email = String(accountUser?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    if (!name || !email) return res.status(400).json({ message: 'Your account must have a valid name and email to register' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (isEventExpired(event)) {
      await processExpiredEvent(event.toObject ? event.toObject() : event, 'events:register');
      return res.status(410).json({ message: 'This event is already done and has been removed.' });
    }

    // basic capacity check
    if (event.capacity && event.registrations.length >= event.capacity) {
      return res.status(400).json({ message: 'Event capacity reached' });
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const hasExisting = event.registrations.some((r) => String(r?.email || '').trim().toLowerCase() === normalizedEmail);
    if (hasExisting) {
      return res.status(409).json({ message: 'You already registered for this event' });
    }

    event.registrations.push({ user: authUser?._id, name, email, phone, status: 'pending' });
    await event.save();
    res.json({ message: 'Registration submitted and pending admin approval', registrations: event.registrations });
  } catch (err) {
    console.error('POST /api/events/:id/register error', err);
    res.status(500).json({ message: 'Failed to register' });
  }
});

// List registrations for an event (admin only)
router.get('/:id/registrations', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim().toLowerCase();
    const event = await Event.findById(req.params.id).select('registrations').lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (isEventExpired(event)) {
      await processExpiredEvent(event, 'events:registrations');
      return res.status(404).json({ message: 'Event not found' });
    }

    let list = Array.isArray(event.registrations) ? event.registrations : [];
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      list = list.filter((r) => String(r?.status || 'pending').toLowerCase() === status);
    }

    list.sort((a, b) => new Date(b?.registeredAt || 0) - new Date(a?.registeredAt || 0));
    return res.json({ registrations: list });
  } catch (err) {
    console.error('GET /api/events/:id/registrations error', err);
    return res.status(500).json({ message: 'Failed to load registrations' });
  }
});

// Approve event registration (admin only)
router.patch('/:id/registrations/:registrationId/approve', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (isEventExpired(event)) {
      await processExpiredEvent(event.toObject ? event.toObject() : event, 'events:approve-registration');
      return res.status(410).json({ message: 'This event is already done and has been removed.' });
    }

    const registration = event.registrations.id(req.params.registrationId);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    registration.status = 'approved';
    registration.rejectionReason = '';
    registration.decisionAt = new Date();
    registration.decisionBy = req.user._id;
    await event.save();

    await createUserNotification({
      recipient: registration.user,
      kind: 'event-registration-approved',
      source: 'Events',
      title: 'Event registration approved',
      message: `Admin approved your registration for ${event.title || 'the event'}.`,
      level: 'success',
      actionPath: '/events',
      metadata: { eventId: String(event._id), registrationId: String(registration._id) },
    });

    return res.json({ message: 'Registration approved', registration });
  } catch (err) {
    console.error('PATCH /api/events/:id/registrations/:registrationId/approve error', err);
    return res.status(500).json({ message: 'Failed to approve registration' });
  }
});

// Reject event registration (admin only)
router.patch('/:id/registrations/:registrationId/reject', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (isEventExpired(event)) {
      await processExpiredEvent(event.toObject ? event.toObject() : event, 'events:reject-registration');
      return res.status(410).json({ message: 'This event is already done and has been removed.' });
    }

    const registration = event.registrations.id(req.params.registrationId);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    registration.status = 'rejected';
    registration.rejectionReason = reason;
    registration.decisionAt = new Date();
    registration.decisionBy = req.user._id;
    await event.save();

    await createUserNotification({
      recipient: registration.user,
      kind: 'event-registration-rejected',
      source: 'Events',
      title: 'Event registration rejected',
      message: reason
        ? `Admin rejected your registration for ${event.title || 'the event'}. Reason: ${reason}`
        : `Admin rejected your registration for ${event.title || 'the event'}.`,
      level: 'error',
      actionPath: '/events',
      metadata: { eventId: String(event._id), registrationId: String(registration._id), reason },
    });

    return res.json({ message: 'Registration rejected', registration });
  } catch (err) {
    console.error('PATCH /api/events/:id/registrations/:registrationId/reject error', err);
    return res.status(500).json({ message: 'Failed to reject registration' });
  }
});

// Submit feedback for an event
router.post('/:id/feedback', async (req, res) => {
  try {
    const { name, email, rating, comments } = req.body;
    if (!name || !email || rating === undefined || rating === null || rating === '') {
      return res.status(400).json({ message: 'Name, email, and rating are required' });
    }

    const ratingValue = Number(rating);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (isEventExpired(event)) {
      await processExpiredEvent(event.toObject ? event.toObject() : event, 'events:feedback');
      return res.status(410).json({ message: 'This event is already done and has been removed.' });
    }

    await sendEventFeedbackEmail({
      event,
      feedback: {
        name,
        email,
        rating: ratingValue,
        comments,
      },
    });

    event.feedback.push({ name, email, rating: ratingValue, comments });
    await event.save();
    res.json({ message: 'Feedback submitted and emailed to admin' });
  } catch (err) {
    console.error('POST /api/events/:id/feedback error', err);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

// Get attendees for an event
router.get('/:id/attendees', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('registrations').lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (isEventExpired(event)) {
      await processExpiredEvent(event, 'events:attendees');
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event.registrations || []);
  } catch (err) {
    console.error('GET /api/events/:id/attendees error', err);
    res.status(500).json({ message: 'Failed to fetch attendees' });
  }
});

module.exports = router;
