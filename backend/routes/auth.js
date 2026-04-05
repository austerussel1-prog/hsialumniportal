const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const User = require('../models/User');
const FeedbackReview = require('../models/FeedbackReview');
const { sendAccountFeedbackEmail } = require('../services/emailService');
const sendOTPEmail = require('../utils/sendEmail');
const { logAuditEvent, getClientIp } = require('../utils/auditLogger');
const { touchUserActivity } = require('../utils/userActivity');
const { uploadLocalFile, cleanupLocalFile } = require('../services/mediaStorage');

const router = express.Router();

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;
const LOGIN_MAX_ATTEMPTS = Math.max(1, parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10) || 5);
const LOGIN_LOCK_MINUTES = Math.max(1, parseInt(process.env.LOGIN_LOCK_MINUTES || '15', 10) || 15);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildUserPayload(user) {
  const visibility = String(user.profileVisibility || '').trim().toLowerCase();
  const normalizedVisibility = visibility === 'private' ? 'private' : 'public';

  return {
    id: user._id,
    name: user.name,
    fullName: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    contactNumber: user.contactNumber,
    graduationYear: user.graduationYear,
    major: user.major,
    company: user.company,
    jobTitle: user.jobTitle,
    languages: user.languages,
    education: user.education,
    skills: user.skills,
    bio: user.bio,
    bio2: user.bio2,
    profileImage: user.profileImage,
    linkedinUrl: user.linkedinUrl,
    twitterUrl: user.twitterUrl,
    instagramUrl: user.instagramUrl,
    projects: user.projects || [],
    careerDocuments: user.careerDocuments || [],
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    loginAlerts: typeof user.loginAlerts === 'boolean' ? user.loginAlerts : true,
    profileVisibility: normalizedVisibility,
    dataRemovalRequestStatus: user.dataRemovalRequestStatus || 'none',
    dataRemovalRequestReviewedAt: user.dataRemovalRequestReviewedAt || null,
    dataRemovalRequestDecisionNote: user.dataRemovalRequestDecisionNote || '',
    createdAt: user.createdAt,
  };
}

function parsePositiveInt(value, fallback, maxValue = 3650) {
  const parsed = parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maxValue);
}

function getAccountDeletionConfig() {
  const graceDays = parsePositiveInt(process.env.ACCOUNT_SOFT_DELETE_GRACE_DAYS, 30, 365);
  const finalActionRaw = String(process.env.ACCOUNT_SOFT_DELETE_FINAL_ACTION || 'delete').trim().toLowerCase();
  const finalAction = finalActionRaw === 'anonymize' ? 'anonymize' : 'delete';
  return { graceDays, finalAction };
}

async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role isDeleted').lean();
    if (!user) {
      return res.status(401).json({ message: 'Invalid token user' });
    }
    if (user.isDeleted) {
      return res.status(403).json({ message: 'This account is scheduled for deletion and can no longer be used.' });
    }

    req.user = { ...decoded, role: user.role };
    touchUserActivity(decoded.id).catch(() => {});
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;


    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }


    const user = await User.findByEmail(email);
    if (!user) {
      await logAuditEvent({
        req,
        actorEmail: email || '',
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: email || '',
        status: 'failure',
        metadata: { reason: 'user_not_found' },
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        message: 'This account is scheduled for deletion and can no longer be used.',
      });
    }

    if (user.lockUntil && new Date(user.lockUntil).getTime() <= Date.now()) {
      await User.updateOne(
        { _id: user._id },
        { $set: { lockUntil: null } }
      );
      user.lockUntil = null;
    }

    if (user.isLoginLocked()) {
      const remainingMs = Math.max(0, new Date(user.lockUntil).getTime() - Date.now());
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));

      await logAuditEvent({
        req,
        actorId: user._id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: String(user._id),
        status: 'failure',
        metadata: { reason: 'account_locked', remainingMinutes },
      });

      return res.status(423).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    if (!user.password || typeof user.password !== 'string') {
      await logAuditEvent({
        req,
        actorId: user._id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: String(user._id),
        status: 'failure',
        metadata: { reason: 'password_not_set' },
      });
      return res.status(401).json({
        message: 'This account has no local password. Use Google sign-in or reset your password first.',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const currentAttempts = Number(user.failedLoginAttempts || 0);
      const nextAttempts = currentAttempts + 1;
      const isNowLocked = nextAttempts >= LOGIN_MAX_ATTEMPTS;
      const lockUntil = isNowLocked
        ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000)
        : null;

      try {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              failedLoginAttempts: isNowLocked ? 0 : nextAttempts,
              lastFailedLoginAt: new Date(),
              lockUntil,
            },
          }
        );
      } catch (counterErr) {
        console.error('[auth] Failed to update login failure counters:', counterErr.message);
      }

      await logAuditEvent({
        req,
        actorId: user._id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: String(user._id),
        status: 'failure',
        metadata: {
          reason: isNowLocked ? 'invalid_password_lockout' : 'invalid_password',
          failedLoginAttempts: isNowLocked ? LOGIN_MAX_ATTEMPTS : nextAttempts,
          lockUntil: lockUntil || null,
        },
      });

      if (isNowLocked) {
        return res.status(423).json({
          message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${LOGIN_LOCK_MINUTES} minute(s).`,
        });
      }

      return res.status(401).json({ message: 'Invalid email or password' });
    }

    try {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            failedLoginAttempts: 0,
            lastFailedLoginAt: null,
            lockUntil: null,
            lastLoginAt: new Date(),
            lastActiveAt: new Date(),
          },
        }
      );
    } catch (counterResetErr) {
      console.error('[auth] Failed to reset login failure counters:', counterResetErr.message);
    }


    if (user.role === 'user') {
      if (user.status === 'rejected') {
        return res.status(403).json({ message: 'Your previous registration was declined. Please register again to retry.' });
      }

      if (user.status !== 'approved') {
        if (user.status === 'pending') {
          return res.status(403).json({ message: 'Your account is pending admin approval' });
        }
      }
    }


    if (user.twoFactorEnabled) {
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendOTPEmail(user.email, otp);

      const twoFactorToken = jwt.sign(
        { id: user._id, email: user.email, purpose: 'login_2fa' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      await logAuditEvent({
        req,
        actorId: user._id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN_2FA_CHALLENGE',
        entityType: 'User',
        entityId: String(user._id),
        status: 'success',
      });

      return res.status(200).json({
        message: 'Verification code sent to your email',
        requiresTwoFactor: true,
        twoFactorToken,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: { role: user.role },
    });

    res.json({
      message: 'Login successful',
      token,
      user: buildUserPayload(user),
      role: user.role,
    });
  } catch (err) {
    console.error('[auth] Login route error:', err);
    res.status(401).json({
      message: 'Invalid email or password',
    });
  }
});

router.post('/login/verify-2fa', async (req, res) => {
  try {
    const twoFactorToken = String(req.body?.twoFactorToken || '').trim();
    const otp = String(req.body?.otp || '').trim();

    if (!twoFactorToken || !otp) {
      return res.status(400).json({ message: '2FA token and OTP are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(twoFactorToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired 2FA token' });
    }

    if (decoded?.purpose !== 'login_2fa' || !decoded?.id) {
      return res.status(401).json({ message: 'Invalid 2FA session' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is not enabled for this account' });
    }

    if (!user.otp || !user.otpExpiry || new Date(user.otpExpiry).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP expired. Please login again to request a new code.' });
    }

    if (String(user.otp) !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.otp = null;
    user.otpExpiry = null;
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_LOGIN_2FA_VERIFY',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
    });

    return res.json({
      message: 'Login successful',
      token,
      user: buildUserPayload(user),
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error verifying login code' });
  }
});

// Quick health-check for auth routes
router.get('/_route_check', (req, res) => {
  res.json({ ok: true, route: '/api/auth' });
});


router.post('/google', async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(500).json({ message: 'Google client not configured on server' });
    }

    const { idToken, source, consent } = req.body; // source: 'login' or 'register'
    if (!idToken) {
      return res.status(400).json({ message: 'Missing Google idToken' });
    }

    if (source === 'register') {
      const hasConsent = Boolean(consent?.termsAccepted) && Boolean(consent?.privacyAccepted);
      if (!hasConsent) {
        return res.status(400).json({ message: 'Terms and Privacy Policy consent is required' });
      }
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Google account missing email' });
    }

    let user = await User.findByEmail(email);
    const consentRecord = source === 'register'
      ? {
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: typeof consent?.termsVersion === 'string' ? consent.termsVersion : 'v1.0',
          privacyVersion: typeof consent?.privacyVersion === 'string' ? consent.privacyVersion : 'v1.0',
          acceptedAt: new Date(),
          source: 'google_register',
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || '',
        }
      : null;

    if (!user) {
      // New user
      if (source === 'login') {
        // On login page, new users should use registration
        return res.status(403).json({ 
          message: 'New users must register first. Please use the registration page.',
          requiresRegistration: true 
        });
      }
      
      // On registration page, send OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      const baseUsername = email.split('@')[0];
      const randomPassword = crypto.randomBytes(32).toString('hex');

      user = new User({
        name: name || baseUsername,
        email,
        username: baseUsername,
        googleId,
        provider: 'google',
        password: randomPassword,
        role: 'user',
        status: 'pending',
        otp,
        otpExpiry,
        consent: consentRecord || undefined,
      });

      await user.save();
      await sendOTPEmail(email, otp);

      await logAuditEvent({
        req,
        actorId: user._id,
        actorEmail: user.email,
        action: 'GOOGLE_REGISTER_OTP_SENT',
        entityType: 'User',
        entityId: String(user._id),
        status: 'success',
      });

      return res.status(200).json({
        message: 'OTP sent to your email',
        requiresOTP: true,
        email,
      });
    } else {
      // Existing user
      if (user.isDeleted) {
        return res.status(403).json({
          message: 'This account is scheduled for deletion and can no longer be used.',
        });
      }
      
      // If rejected or pending, handle based on source
      if ((user.status === 'rejected' || user.status === 'pending') && user.role === 'user') {
        if (source === 'login') {
          // On login page, don't send OTP for non-approved users
          const msg = user.status === 'pending'
            ? 'Your account is pending admin approval'
            : 'Your account registration was declined. Please register again to retry.';
          return res.status(403).json({ message: msg });
        }
        
        // On registration page, send OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        user.status = 'pending';
        user.googleId = googleId;
        user.provider = 'google';
        if (consentRecord) user.consent = consentRecord;
        await user.save();
        await sendOTPEmail(user.email, otp);

        await logAuditEvent({
          req,
          actorId: user._id,
          actorEmail: user.email,
          action: 'GOOGLE_REGISTER_OTP_SENT',
          entityType: 'User',
          entityId: String(user._id),
          status: 'success',
          metadata: { existingUser: true },
        });

        return res.status(200).json({
          message: 'OTP sent to your email',
          requiresOTP: true,
          email: user.email,
        });
      }
      
      // Approved user - proceed with login
      // Link Google ID if not already present
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = 'google';
      }
      user.lastLoginAt = new Date();
      user.lastActiveAt = new Date();
      await user.save();
    }

    if (!user.lastLoginAt || !user.lastActiveAt) {
      await touchUserActivity(user._id, { login: true });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_GOOGLE_LOGIN',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: { source: source || 'unknown' },
    });

    res.json({
      message: 'Login successful',
      token,
      user: buildUserPayload(user),
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    await logAuditEvent({
      req,
      actorEmail: req.body?.email || '',
      action: 'AUTH_GOOGLE_LOGIN',
      entityType: 'User',
      entityId: req.body?.email || '',
      status: 'failure',
      metadata: { error: err.message },
    });
    res.status(400).json({ message: 'Google authentication failed' });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpiry -failedLoginAttempts -lastFailedLoginAt -lockUntil -emailHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Debugging: log current stored profileImage when user fetches profile
    try {
      console.log(`GET /api/auth/me - returning profileImage length: ${user.profileImage ? String(user.profileImage).length : 0} for user ${user.email}`);
    } catch (lg) {
      console.log('GET /api/auth/me - error logging profileImage', lg);
    }

    res.json({ user: buildUserPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Directory listing for authenticated users
router.get('/directory', verifyToken, async (req, res) => {
  try {
    const includePrivate = String(req.query?.includePrivate || '').trim() === '1';
    const isAdminViewer = ['super_admin', 'admin', 'hr', 'alumni_officer'].includes(String(req.user?.role || ''));
    const pendingFilter = { status: { $ne: 'pending' } };
    const visibilityFilter = (isAdminViewer || includePrivate)
      ? {}
      : {
          $or: [
            { profileVisibility: { $ne: 'private' } },
            { _id: req.user.id },
          ],
        };
    const query = {
      ...pendingFilter,
      ...visibilityFilter,
    };

    const users = await User.find(query)
      .select('-password -otp -otpExpiry -failedLoginAttempts -lastFailedLoginAt -lockUntil -emailHash')
      .sort({ createdAt: -1 });

    res.json({ users: users.map((user) => buildUserPayload(user)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching directory' });
  }
});

// Directory profile detail for authenticated users
router.get('/directory/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password -otp -otpExpiry -failedLoginAttempts -lastFailedLoginAt -lockUntil -emailHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isSelf = String(user._id) === String(req.user.id);
    const isAdminViewer = ['super_admin', 'admin', 'hr', 'alumni_officer'].includes(String(req.user?.role || ''));
    if (!isSelf && !isAdminViewer && String(user.profileVisibility || '').trim().toLowerCase() === 'private') {
      return res.status(403).json({ message: 'This profile is private' });
    }

    res.json({ user: buildUserPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update current user profile
router.put('/me', verifyToken, async (req, res) => {
  try {
    const {
      fullName,
      email,
      jobTitle,
      contactNumber,
      graduationYear,
      major,
      company,
      languages,
      education,
      skills,
      bio,
      bio2,
      profileImage,
      linkedinUrl,
      twitterUrl,
      instagramUrl,
      projects,
      careerDocuments,
    } = req.body;

    // Debugging: log incoming profileImage presence/size to help diagnose persistence issues
    try {
      const imgLen = profileImage && typeof profileImage === 'string' ? profileImage.length : 0;
      console.log(`PUT /api/auth/me - incoming profileImage length: ${imgLen}`);
    } catch (logErr) {
      console.log('PUT /api/auth/me - error measuring profileImage length', logErr);
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Debugging: show current and incoming profileImage summary
    try {
      console.log(`PUT /api/auth/me - user ${user.email} (id: ${user._id}) current profileImage length: ${user.profileImage ? String(user.profileImage).length : 0}`);
      console.log(`PUT /api/auth/me - incoming profileImage length: ${profileImage && typeof profileImage === 'string' ? profileImage.length : 0}`);
    } catch (lg) {
      console.log('PUT /api/auth/me - error logging profileImage info', lg);
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && existingEmail._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (typeof fullName === 'string') user.name = fullName;
    if (typeof jobTitle === 'string') user.jobTitle = jobTitle;
    if (typeof contactNumber === 'string') user.contactNumber = contactNumber;
    if (typeof graduationYear === 'string') user.graduationYear = graduationYear;
    if (typeof major === 'string') user.major = major;
    if (typeof company === 'string') user.company = company;
    if (typeof languages === 'string') user.languages = languages;
    if (typeof education === 'string') user.education = education;
    if (typeof skills === 'string') user.skills = skills;
    if (typeof bio === 'string') user.bio = bio;
    if (typeof bio2 === 'string') user.bio2 = bio2;
    if (typeof profileImage === 'string') user.profileImage = profileImage;
    if (typeof linkedinUrl === 'string') user.linkedinUrl = linkedinUrl;
    if (typeof twitterUrl === 'string') user.twitterUrl = twitterUrl;
    if (typeof instagramUrl === 'string') user.instagramUrl = instagramUrl;
    if (Array.isArray(projects)) user.projects = projects;
    if (Array.isArray(careerDocuments)) user.careerDocuments = careerDocuments;

    await user.save();

    res.json({ message: 'Profile updated', user: buildUserPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

router.put('/me/privacy', verifyToken, async (req, res) => {
  try {
    const twoFactorEnabled = Boolean(req.body?.twoFactorEnabled);
    const loginAlerts = typeof req.body?.loginAlerts === 'boolean' ? req.body.loginAlerts : true;
    const profileVisibilityRaw = String(req.body?.profileVisibility || 'public').trim().toLowerCase();
    const profileVisibility = profileVisibilityRaw === 'private' ? 'private' : 'public';

    if (!['public', 'private'].includes(profileVisibility)) {
      return res.status(400).json({ message: 'Invalid profile visibility option' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.twoFactorEnabled = twoFactorEnabled;
    user.loginAlerts = loginAlerts;
    user.profileVisibility = profileVisibility;
    await user.save();

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_UPDATE_PRIVACY_SETTINGS',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: {
        twoFactorEnabled,
        loginAlerts,
        profileVisibility,
      },
    });

    return res.json({
      message: 'Privacy settings updated successfully',
      user: buildUserPayload(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating privacy settings' });
  }
});

router.post('/me/request-data-removal', verifyToken, async (req, res) => {
  try {
    const note = String(req.body?.note || '').trim().slice(0, 1000);
    const requestedFinalAction = String(req.body?.finalAction || '').trim().toLowerCase() === 'anonymize'
      ? 'anonymize'
      : 'delete';
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isDeleted) {
      return res.status(400).json({ message: 'Account already scheduled for deletion' });
    }
    if (user.dataRemovalRequestStatus === 'pending') {
      return res.status(400).json({ message: 'A data removal request is already pending admin review.' });
    }

    user.dataRemovalRequestedAt = new Date();
    user.dataRemovalRequestStatus = 'pending';
    user.dataRemovalRequestedFinalAction = requestedFinalAction;
    user.dataRemovalRequestReviewedAt = null;
    user.dataRemovalRequestReviewedBy = null;
    user.dataRemovalRequestDecisionNote = '';
    user.dataRemovalRequestNote = note;
    await user.save();

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_REQUEST_DATA_REMOVAL',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: { hasNote: Boolean(note), requestedFinalAction },
    });

    return res.json({
      message: 'Data removal request submitted. Waiting for admin approval.',
      requestedAt: user.dataRemovalRequestedAt,
      requestStatus: user.dataRemovalRequestStatus,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error submitting data removal request' });
  }
});

router.post('/me/delete-account', verifyToken, async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    const requestedFinalActionRaw = String(req.body?.finalAction || '').trim().toLowerCase();
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isDeleted) {
      return res.status(400).json({ message: 'Account is already scheduled for deletion' });
    }

    const { graceDays, finalAction: envFinalAction } = getAccountDeletionConfig();
    const finalAction = ['delete', 'anonymize'].includes(requestedFinalActionRaw)
      ? requestedFinalActionRaw
      : envFinalAction;
    const now = new Date();
    const scheduledDeletionAt = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);

    user.isDeleted = true;
    user.deletedAt = now;
    user.deletionRequestedAt = now;
    user.scheduledDeletionAt = scheduledDeletionAt;
    user.deletionReason = reason;
    user.deletionFinalAction = finalAction;
    user.dataRemovalRequestedAt = user.dataRemovalRequestedAt || now;
    user.otp = null;
    user.otpExpiry = null;
    user.clearLoginFailures();
    await user.save();

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_DELETE_ACCOUNT_SOFT',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: { graceDays, finalAction },
    });

    return res.json({
      message: 'Account scheduled for deletion.',
      graceDays,
      finalAction,
      scheduledDeletionAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error scheduling account deletion' });
  }
});

router.post('/me/change-password', verifyToken, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'No local password set for this account' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      await logAuditEvent({
        req,
        actorId: user._id,
        actorEmail: user.email,
        action: 'AUTH_CHANGE_PASSWORD',
        entityType: 'User',
        entityId: String(user._id),
        status: 'failure',
        metadata: { reason: 'invalid_current_password' },
      });
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_CHANGE_PASSWORD',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
    });

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    await logAuditEvent({
      req,
      actorId: req.user?.id || null,
      actorEmail: '',
      action: 'AUTH_CHANGE_PASSWORD',
      entityType: 'User',
      entityId: String(req.user?.id || ''),
      status: 'failure',
      metadata: { error: err.message },
    });
    return res.status(500).json({ message: 'Error changing password' });
  }
});

router.get('/feedback/alumni-users', verifyToken, async (req, res) => {
  try {
    const alumniUsers = await User.find({
      role: { $in: ['alumni', 'user'] },
      status: { $ne: 'rejected' },
      _id: { $ne: req.user.id },
    })
      .select('_id name email role')
      .sort({ name: 1 })
      .lean({ getters: true });

    return res.json({
      users: alumniUsers.map((item) => ({
        id: String(item._id),
        name: item.name || 'User',
        email: item.email || '',
        role: item.role || '',
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load alumni users' });
  }
});

router.get('/feedback/reviews', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10) || 100, 1), 200);
    const reviews = await FeedbackReview.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'name email profileImage')
      .populate('targetUser', 'name email')
      .lean();

    return res.json({
      reviews: reviews.map((item) => ({
        id: String(item._id),
        feedbackType: item.feedbackType,
        subject: item.subject || '',
        message: item.message || '',
        rating: Number(item.rating || 0),
        npsScore: item.feedbackType === 'website_nps' && item.npsScore !== null && typeof item.npsScore !== 'undefined'
          ? Number(item.npsScore)
          : null,
        program: item.feedbackType === 'program_evaluation' ? (item.program || '') : '',
        createdAt: item.createdAt,
        authorName: item.author?.name || 'User',
        authorEmail: item.author?.email || '',
        authorProfileImage: item.author?.profileImage || '',
        targetUserName: item.feedbackType === 'alumni_feedback' ? (item.targetUser?.name || '') : '',
        targetUserEmail: item.feedbackType === 'alumni_feedback' ? (item.targetUser?.email || '') : '',
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load feedback reviews' });
  }
});

router.post('/feedback', verifyToken, async (req, res) => {
  try {
    const feedbackType = String(req.body?.feedbackType || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    const rating = Number(req.body?.rating || 0);
    const npsScoreRaw = req.body?.npsScore;
    const npsScore = npsScoreRaw === '' || npsScoreRaw === null || typeof npsScoreRaw === 'undefined'
      ? null
      : Number(npsScoreRaw);
    const targetUserId = String(req.body?.targetUserId || '').trim();
    const program = String(req.body?.program || '').trim();

    const allowedTypes = ['alumni_feedback', 'program_evaluation', 'suggestion_improvement', 'website_nps'];
    if (!allowedTypes.includes(feedbackType)) {
      return res.status(400).json({ message: 'Invalid feedback type' });
    }

    if (!message) {
      return res.status(400).json({ message: 'Feedback message is required' });
    }

    if (feedbackType === 'alumni_feedback' && !targetUserId) {
      return res.status(400).json({ message: 'Please select an alumni user' });
    }

    if (feedbackType === 'program_evaluation' && !program) {
      return res.status(400).json({ message: 'Please select a program' });
    }

    if (feedbackType === 'website_nps' && (npsScore === null || Number.isNaN(npsScore) || npsScore < 0 || npsScore > 10)) {
      return res.status(400).json({ message: 'NPS score must be between 0 and 10' });
    }

    const normalizedTargetUserId = feedbackType === 'alumni_feedback' ? targetUserId : '';
    const normalizedProgram = feedbackType === 'program_evaluation' ? program : '';
    const normalizedNpsScore = feedbackType === 'website_nps' && Number.isFinite(npsScore)
      ? npsScore
      : null;

    let targetUser = null;
    if (normalizedTargetUserId) {
      targetUser = await User.findById(normalizedTargetUserId).select('_id name email').lean({ getters: true });
      if (!targetUser) {
        return res.status(404).json({ message: 'Target user not found' });
      }
    }

    const user = await User.findById(req.user.id).select('name email role').lean({ getters: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const created = await FeedbackReview.create({
      author: req.user.id,
      feedbackType,
      subject,
      message,
      rating: Number.isFinite(rating) ? rating : 0,
      npsScore: normalizedNpsScore,
      targetUser: targetUser ? targetUser._id : null,
      program: normalizedProgram,
      metadata: {
        ipAddress: getClientIp(req),
      },
    });

    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        actorEmail: user.email,
        action: 'USER_SUBMIT_ACCOUNT_FEEDBACK',
        entityType: 'FeedbackReview',
        entityId: String(created._id),
        status: 'success',
        metadata: {
          feedbackType,
          subject,
          program: normalizedProgram,
          targetUserId: targetUser ? String(targetUser._id) : '',
          rating: Number.isFinite(rating) ? rating : 0,
          npsScore: normalizedNpsScore,
        },
      });
    } catch (auditErr) {
      console.error('Feedback success audit log failed:', auditErr);
    }

    let emailDeliveryFailed = false;
    let emailErrorMessage = '';

    try {
      await sendAccountFeedbackEmail({
        user,
        feedback: {
          feedbackType,
          subject,
          message,
          rating: Number.isFinite(rating) ? rating : 0,
          npsScore: normalizedNpsScore,
          program: normalizedProgram,
          targetUserName: targetUser?.name || '',
          targetUserEmail: targetUser?.email || '',
        },
      });
    } catch (emailErr) {
      emailDeliveryFailed = true;
      emailErrorMessage = emailErr?.message || 'Unknown email error';
      console.error('Feedback email delivery failed:', emailErr);

      try {
        await logAuditEvent({
          req,
          actorId: req.user.id,
          actorEmail: user.email,
          action: 'USER_SUBMIT_ACCOUNT_FEEDBACK_EMAIL',
          entityType: 'FeedbackReview',
          entityId: String(created._id),
          status: 'failure',
          metadata: {
            error: emailErrorMessage,
            feedbackType,
          },
        });
      } catch (auditErr) {
        console.error('Feedback email-failure audit log failed:', auditErr);
      }
    }

    return res.status(201).json({
      message: emailDeliveryFailed
        ? 'Feedback submitted, but email delivery failed. Please check email configuration.'
        : 'Feedback submitted successfully',
      reviewId: String(created._id),
      emailDelivered: !emailDeliveryFailed,
    });
  } catch (err) {
    console.error('Feedback submission failed:', err);
    try {
      await logAuditEvent({
        req,
        actorId: req.user?.id || null,
        actorEmail: '',
        action: 'USER_SUBMIT_ACCOUNT_FEEDBACK',
        entityType: 'User',
        entityId: String(req.user?.id || ''),
        status: 'failure',
        metadata: { error: err.message },
      });
    } catch (auditErr) {
      console.error('Feedback failure audit log failed:', auditErr);
    }
    return res.status(500).json({
      message: process.env.NODE_ENV === 'development'
        ? `Failed to submit feedback: ${err.message}`
        : 'Failed to submit feedback',
    });
  }
});

// Avatar upload - saves file under /uploads and updates user's profileImage
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, `${unique}-${safeName}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.post('/me/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Save cloud URL when configured; otherwise keep local uploads path.
    let profileImageUrl = `/uploads/${req.file.filename}`;
    try {
      const uploadedUrl = await uploadLocalFile(req.file.path, { folder: 'avatars', resourceType: 'image' });
      if (uploadedUrl) {
        profileImageUrl = uploadedUrl;
        cleanupLocalFile(req.file.path);
      }
    } catch (uploadErr) {
      console.error('Avatar cloud upload failed:', uploadErr.message);
    }

    user.profileImage = profileImageUrl;
    await user.save();

    res.json({ message: 'Avatar uploaded', url: user.profileImage, user: buildUserPayload(user) });
  } catch (err) {
    console.error('Error uploading avatar', err);
    res.status(500).json({ message: 'Error uploading avatar' });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOTPEmail(email, otp);

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_FORGOT_PASSWORD_OTP_SENT',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
    });

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    await logAuditEvent({
      req,
      actorEmail: req.body?.email || '',
      action: 'AUTH_FORGOT_PASSWORD_OTP_SENT',
      entityType: 'User',
      entityId: req.body?.email || '',
      status: 'failure',
      metadata: { error: err.message },
    });
    res.status(500).json({ message: 'Error sending OTP: ' + err.message });
  }
});

// Verify OTP for Password Reset
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: 'No OTP request found. Please request a new OTP.' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP verified successfully - clear OTP but don't change password yet
    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: 'No OTP request found' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update password and clear OTP
    user.password = newPassword;
    user.clearLoginFailures();
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = { router, verifyToken };
