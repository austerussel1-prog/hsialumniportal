const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');


require('dotenv').config({ path: path.join(__dirname, '.env') });

const { router: authRoutes } = require('./routes/auth');
const registerRoutes = require('./routes/register');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');

const announcementRoutes = require('./routes/announcements');
const referralRoutes = require('./routes/referrals');
const achievementRoutes = require('./routes/achievements');
const eventsRoutes = require('./routes/events');
const documentsRoutes = require('./routes/documents');
const mentorshipRoutes = require('./routes/mentorship');
const jobApplicationRoutes = require('./routes/jobApplications');
const { scheduleDataRetentionJob } = require('./services/privacyRetentionService');
const { hasEncryptionKey, getEncryptionKeyFingerprint } = require('./utils/fieldEncryption');

const app = express();


app.use(cors());
// Allow larger JSON payloads (e.g. base64-encoded profile images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// serve uploaded media files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


if (!process.env.MONGODB_URI) {
  console.error('MongoDB connection error: MONGODB_URI is undefined. Check your .env file.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !hasEncryptionKey()) {
  console.error('Startup error: DATA_ENCRYPTION_KEY is required in production.');
  process.exit(1);
}

if (hasEncryptionKey()) {
  console.log(`[privacy] Encryption key fingerprint: ${getEncryptionKeyFingerprint()}`);
} else {
  console.warn('[privacy] DATA_ENCRYPTION_KEY is not set. Sensitive fields may be exposed as encrypted text.');
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    scheduleDataRetentionJob();
  })
  .catch(err => console.log('MongoDB connection error:', err));



// Log requests to /api/auth to help debug missing route issues
// Quick route check (mounted at server level) to ensure auth path is reachable
app.get('/api/auth/_route_check', (req, res) => {
  console.log('SERVER _route_check hit for /api/auth');
  res.json({ ok: true, route: '/api/auth' });
});

app.use('/api/auth', (req, res, next) => {
  console.log('AUTH_PROXY', req.method, req.originalUrl || req.url);
  next();
}, authRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/job-applications', jobApplicationRoutes);


app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    message: 'Backend is working!',
    nodeEnv: process.env.NODE_ENV || 'unset',
    encryptionConfigured: hasEncryptionKey(),
    encryptionKeyFingerprint: hasEncryptionKey() ? getEncryptionKeyFingerprint() : null,
    commit:
      process.env.RENDER_GIT_COMMIT
      || process.env.RENDER_GIT_BRANCH
      || process.env.VERCEL_GIT_COMMIT_SHA
      || null,
  });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
