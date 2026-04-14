const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Achievement = require('../models/Achievement');
const AuditLog = require('../models/AuditLog');
const {
  sendApprovalEmail,
  sendRejectionEmail,
  sendDataRemovalDecisionEmail,
  sendAdminVerificationEmail,
} = require('../services/emailService');
const { hardDeleteUsersByIds } = require('../services/userDeletionService');
const { verifyToken } = require('./auth');
const { logAuditEvent } = require('../utils/auditLogger');
const { decryptField, isEncryptedValue } = require('../utils/fieldEncryption');

const router = express.Router();
const ADMIN_CREATABLE_ROLES = new Set(['admin', 'hr', 'alumni_officer']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function parsePositiveInt(value, fallback, maxValue = 3650) {
  const parsed = parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maxValue);
}

function normalizeEmailInput(value) {
  return String(value || '').trim().toLowerCase();
}

function getAllowedAdminEmailDomains() {
  return String(process.env.ALLOWED_ADMIN_EMAIL_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

function getAdminEmailValidationError(email) {
  const normalizedEmail = normalizeEmailInput(email);
  if (!normalizedEmail) return 'Email address is required';
  if (!EMAIL_REGEX.test(normalizedEmail)) return 'Enter a valid email address';

  const allowedDomains = getAllowedAdminEmailDomains();
  if (!allowedDomains.length) return '';

  const domain = normalizedEmail.split('@')[1] || '';
  if (allowedDomains.includes(domain)) return '';

  return `Only these email domains are allowed: ${allowedDomains.join(', ')}`;
}

function getBackendBaseUrl(req) {
  const configuredBaseUrl = String(
    process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || ''
  ).trim().replace(/\/$/, '');

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host') || 'localhost:5000';

  return `${protocol}://${host}`;
}

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
}

function buildAdminVerificationRedirectUrl(status) {
  const target = new URL('/login', `${getFrontendBaseUrl()}/`);
  target.searchParams.set('adminVerification', status);
  return target.toString();
}

function generateTemporaryPassword(length = 12) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*';
  const allChars = `${uppercase}${lowercase}${digits}${symbols}`;
  const passwordChars = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  while (passwordChars.length < length) {
    passwordChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  for (let index = passwordChars.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [passwordChars[index], passwordChars[swapIndex]] = [passwordChars[swapIndex], passwordChars[index]];
  }

  return passwordChars.join('');
}

function createAdminVerificationToken(userId) {
  const tokenSecret = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenSecret).digest('hex');
  const ttlHours = parsePositiveInt(process.env.ADMIN_EMAIL_VERIFICATION_HOURS, 24, 168);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  return {
    token: `${String(userId)}.${tokenSecret}`,
    tokenHash,
    expiresAt,
  };
}

function mapCreateAdminDuplicateKeyError(err) {
  if (err?.code !== 11000) return '';
  if (err?.keyPattern?.emailHash) return 'Email already registered';
  if (err?.keyPattern?.employeeId) return 'Employee ID already in use';
  return 'Duplicate record found';
}

function canReuseUserForAdminCreation(user) {
  if (!user) return false;
  return user.isDeleted || user.status === 'rejected';
}

function getAccountDeletionConfig() {
  const graceDays = parsePositiveInt(process.env.ACCOUNT_SOFT_DELETE_GRACE_DAYS, 30, 365);
  const finalActionRaw = String(process.env.ACCOUNT_SOFT_DELETE_FINAL_ACTION || 'delete').trim().toLowerCase();
  const finalAction = finalActionRaw === 'anonymize' ? 'anonymize' : 'delete';
  return { graceDays, finalAction };
}

function displayName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!isEncryptedValue(raw)) return raw;
  return decryptField(raw);
}

function revealEncrypted(value) {
  if (value === null || typeof value === 'undefined') return value;
  const raw = String(value);
  if (!isEncryptedValue(raw)) return value;
  return decryptField(raw);
}

function normalizeUserRecord(user) {
  if (!user) return user;
  return {
    ...user,
    name: revealEncrypted(user.name),
    contactNumber: revealEncrypted(user.contactNumber),
    address: revealEncrypted(user.address),
    profileImage: revealEncrypted(user.profileImage),
  };
}

function isLegacyPendingRequest(user) {
  const status = String(user?.dataRemovalRequestStatus || '').trim().toLowerCase();
  if (status === 'pending') return true;
  if (['approved', 'rejected'].includes(status)) return false;

  return Boolean(
    user?.dataRemovalRequestedAt &&
    !user?.dataRemovalRequestReviewedAt &&
    !user?.isDeleted
  );
}

async function normalizeLegacyDataRemovalRequests() {
  await User.updateMany(
    {
      dataRemovalRequestedAt: { $ne: null },
      dataRemovalRequestReviewedAt: null,
      isDeleted: { $ne: true },
      $or: [
        { dataRemovalRequestStatus: { $exists: false } },
        { dataRemovalRequestStatus: null },
        { dataRemovalRequestStatus: '' },
        { dataRemovalRequestStatus: 'none' },
      ],
    },
    {
      $set: {
        dataRemovalRequestStatus: 'pending',
      },
    }
  );

  await User.updateMany(
    {
      dataRemovalRequestedAt: { $ne: null },
      $or: [
        { dataRemovalRequestedFinalAction: { $exists: false } },
        { dataRemovalRequestedFinalAction: null },
        { dataRemovalRequestedFinalAction: '' },
      ],
    },
    {
      $set: {
        dataRemovalRequestedFinalAction: 'delete',
      },
    }
  );
}

const DATA_REMOVAL_EMAIL_TIMEOUT_MS = 8000;

async function sendDataRemovalDecisionEmailWithTimeout(payload) {
  try {
    await Promise.race([
      sendDataRemovalDecisionEmail(payload),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timed out after ${DATA_REMOVAL_EMAIL_TIMEOUT_MS}ms`)), DATA_REMOVAL_EMAIL_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch (mailErr) {
    console.error('[admin] Failed to send data removal decision email:', mailErr.message);
    return false;
  }
}


const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.isDeleted || !['super_admin', 'admin', 'hr', 'alumni_officer'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};



router.get('/pending-users', verifyAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({
      status: 'pending',
      role: 'user',
      registrationVerifiedAt: { $ne: null },
    })
      .select('-password -otp -otpExpiry -failedLoginAttempts -lastFailedLoginAt -lockUntil -emailHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ users: pendingUsers.map(normalizeUserRecord) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching pending users' });
  }
});


router.get('/all-users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'super_admin' } })
      .select('-password -otp -otpExpiry -failedLoginAttempts -lastFailedLoginAt -lockUntil -emailHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ users: users.map(normalizeUserRecord) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});


router.post('/create-admin', verifyAdmin, async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const employeeId = String(req.body?.employeeId || '').trim();
    const email = normalizeEmailInput(req.body?.email);
    const contactNumber = String(req.body?.contactNumber || '').trim();
    const address = String(req.body?.address || '').trim();
    const role = String(req.body?.role || '').trim().toLowerCase();

    if (!fullName || !employeeId || !email || !contactNumber || !address || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!ADMIN_CREATABLE_ROLES.has(role)) {
      return res.status(400).json({ message: 'Select a valid admin role' });
    }

    const emailValidationError = getAdminEmailValidationError(email);
    if (emailValidationError) {
      return res.status(400).json({ message: emailValidationError });
    }

    const existingEmail = await User.findByEmail(email);
    const reusableExistingUser = canReuseUserForAdminCreation(existingEmail) ? existingEmail : null;

    if (existingEmail && !reusableExistingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const existingEmployeeId = await User.findOne({ employeeId });
    if (
      existingEmployeeId
      && (!reusableExistingUser || String(existingEmployeeId._id) !== String(reusableExistingUser._id))
    ) {
      return res.status(409).json({ message: 'Employee ID already in use' });
    }

    const tempPassword = generateTemporaryPassword();

    const newAdmin = reusableExistingUser || new User();
    newAdmin.name = fullName;
    newAdmin.employeeId = employeeId;
    newAdmin.email = email;
    newAdmin.contactNumber = contactNumber;
    newAdmin.address = address;
    newAdmin.password = tempPassword;
    newAdmin.role = role;
    newAdmin.status = 'pending';
    newAdmin.provider = 'local';
    newAdmin.googleId = null;
    newAdmin.registrationVerifiedAt = null;
    newAdmin.approvedAt = null;
    newAdmin.otp = null;
    newAdmin.otpExpiry = null;
    newAdmin.isDeleted = false;
    newAdmin.deletedAt = null;
    newAdmin.deletionRequestedAt = null;
    newAdmin.scheduledDeletionAt = null;
    newAdmin.deletionReason = '';
    newAdmin.dataRemovalRequestedAt = null;
    newAdmin.dataRemovalRequestStatus = 'none';
    newAdmin.dataRemovalRequestedFinalAction = 'delete';
    newAdmin.dataRemovalRequestReviewedAt = null;
    newAdmin.dataRemovalRequestReviewedBy = null;
    newAdmin.dataRemovalRequestDecisionNote = '';
    newAdmin.dataRemovalRequestNote = '';
    newAdmin.clearLoginFailures();

    await newAdmin.save();

    const { token, tokenHash, expiresAt } = createAdminVerificationToken(newAdmin._id);
    newAdmin.emailVerificationTokenHash = tokenHash;
    newAdmin.emailVerificationTokenExpiresAt = expiresAt;
    newAdmin.emailVerificationSentAt = new Date();
    await newAdmin.save();

    const verificationUrl = `${getBackendBaseUrl(req)}/api/admin/verify-email?token=${encodeURIComponent(token)}`;

    try {
      await sendAdminVerificationEmail({
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        temporaryPassword: tempPassword,
        verificationUrl,
        expiresAt,
      });
    } catch (mailErr) {
      await User.deleteOne({ _id: newAdmin._id }).catch(() => {});
      console.error('[admin] Failed to send admin verification email:', mailErr.message);
      return res.status(502).json({
        message: 'Admin account could not be created because the verification email failed to send.',
      });
    }

    await logAuditEvent({
      req,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      action: 'ADMIN_CREATE_ADMIN',
      entityType: 'User',
      entityId: String(newAdmin._id),
      status: 'success',
      metadata: {
        createdRole: newAdmin.role,
        createdEmail: newAdmin.email,
        verificationSent: true,
        reusedExistingUser: Boolean(reusableExistingUser),
      },
    });

    res.status(201).json({
      message: 'Admin user created. A verification email with a temporary password has been sent.',
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        status: newAdmin.status,
        employeeId: newAdmin.employeeId,
        contactNumber: newAdmin.contactNumber,
        address: newAdmin.address,
      },
    });
  } catch (err) {
    console.error(err);
    const duplicateMessage = mapCreateAdminDuplicateKeyError(err);
    await logAuditEvent({
      req,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      action: 'ADMIN_CREATE_ADMIN',
      entityType: 'User',
      entityId: '',
      status: 'failure',
      metadata: { error: err.message },
    });
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

router.get('/verify-email', async (req, res) => {
  const token = String(req.query?.token || '').trim();

  if (!token) {
    return res.redirect(buildAdminVerificationRedirectUrl('invalid'));
  }

  const separatorIndex = token.indexOf('.');
  const userId = separatorIndex > 0 ? token.slice(0, separatorIndex) : '';
  const tokenSecret = separatorIndex > 0 ? token.slice(separatorIndex + 1) : '';

  if (!userId || !tokenSecret) {
    return res.redirect(buildAdminVerificationRedirectUrl('invalid'));
  }

  try {
    const user = await User.findById(userId)
      .select('+emailVerificationTokenHash +emailVerificationTokenExpiresAt');

    if (!user || user.isDeleted) {
      return res.redirect(buildAdminVerificationRedirectUrl('invalid'));
    }

    if (user.registrationVerifiedAt && user.status === 'approved') {
      return res.redirect(buildAdminVerificationRedirectUrl('already-verified'));
    }

    if (!user.emailVerificationTokenHash || !user.emailVerificationTokenExpiresAt) {
      return res.redirect(buildAdminVerificationRedirectUrl('invalid'));
    }

    if (new Date(user.emailVerificationTokenExpiresAt).getTime() < Date.now()) {
      user.emailVerificationTokenHash = null;
      user.emailVerificationTokenExpiresAt = null;
      await user.save();
      return res.redirect(buildAdminVerificationRedirectUrl('expired'));
    }

    const incomingHash = crypto.createHash('sha256').update(tokenSecret).digest('hex');
    if (incomingHash !== user.emailVerificationTokenHash) {
      return res.redirect(buildAdminVerificationRedirectUrl('invalid'));
    }

    user.registrationVerifiedAt = new Date();
    user.status = 'approved';
    user.approvedAt = new Date();
    user.emailVerificationTokenHash = null;
    user.emailVerificationTokenExpiresAt = null;
    await user.save();

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'ADMIN_VERIFY_EMAIL',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: { verifiedRole: user.role },
    });

    return res.redirect(buildAdminVerificationRedirectUrl('success'));
  } catch (err) {
    console.error('[admin] Error verifying admin email:', err);
    await logAuditEvent({
      req,
      actorEmail: '',
      action: 'ADMIN_VERIFY_EMAIL',
      entityType: 'User',
      entityId: userId || '',
      status: 'failure',
      metadata: { error: err.message },
    });
    return res.redirect(buildAdminVerificationRedirectUrl('error'));
  }
});


router.post('/approve/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'approved';
    user.approvedAt = new Date();
    await user.save();

    let notificationSent = true;
    try {
      await sendApprovalEmail(user.email, user.name);
    } catch (mailErr) {
      notificationSent = false;
      console.error('[admin] Failed to send approval email:', mailErr.message);
    }

    await logAuditEvent({
      req,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      action: 'ADMIN_APPROVE_USER',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: { approvedEmail: user.email, notificationSent },
    });

    res.json({
      message: notificationSent
        ? 'User approved successfully'
        : 'User approved successfully, but the approval email could not be sent.',
      notificationSent,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (err) {
    console.error(err);
    await logAuditEvent({
      req,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      action: 'ADMIN_APPROVE_USER',
      entityType: 'User',
      entityId: req.params?.userId || '',
      status: 'failure',
      metadata: { error: err.message },
    });
    res.status(500).json({ message: 'Error approving user' });
  }
});


router.post('/reject/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'rejected' },
      { new: true, runValidators: false }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let notificationSent = true;
    try {
      await sendRejectionEmail(user.email, user.name, reason);
    } catch (mailErr) {
      notificationSent = false;
      console.error('[admin] Failed to send rejection email:', mailErr.message);
    }

    await logAuditEvent({
      req,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      action: 'ADMIN_REJECT_USER',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: { rejectedEmail: user.email, reason: reason || '', notificationSent },
    });

    res.json({
      message: notificationSent
        ? 'User rejected successfully'
        : 'User rejected successfully, but the rejection email could not be sent.',
      notificationSent,
    });
  } catch (err) {
    console.error(err);
    await logAuditEvent({
      req,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      action: 'ADMIN_REJECT_USER',
      entityType: 'User',
      entityId: req.params?.userId || '',
      status: 'failure',
      metadata: { error: err.message },
    });
    res.status(500).json({ message: 'Error rejecting user' });
  }
});


router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const approvedUsers = await User.countDocuments({ role: 'user', status: 'approved' });
    const pendingUsers = await User.countDocuments({
      role: 'user',
      status: 'pending',
      registrationVerifiedAt: { $ne: null },
    });
    const rejectedUsers = await User.countDocuments({ role: 'user', status: 'rejected' });
    const totalUsers = approvedUsers + pendingUsers + rejectedUsers;

    res.json({
      totalUsers,
      approvedUsers,
      pendingUsers,
      rejectedUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

router.get('/data-removal-requests', verifyAdmin, async (req, res) => {
  try {
    await normalizeLegacyDataRemovalRequests();

    const statusRaw = String(req.query.status || 'pending').trim().toLowerCase();
    const allowed = new Set(['pending', 'approved', 'rejected', 'all']);
    const status = allowed.has(statusRaw) ? statusRaw : 'pending';

    let filter = {};
    if (status === 'pending') {
      filter = {
        $or: [
          { dataRemovalRequestStatus: 'pending' },
          {
            dataRemovalRequestedAt: { $ne: null },
            dataRemovalRequestReviewedAt: null,
            isDeleted: { $ne: true },
            $or: [
              { dataRemovalRequestStatus: { $exists: false } },
              { dataRemovalRequestStatus: null },
              { dataRemovalRequestStatus: '' },
              { dataRemovalRequestStatus: 'none' },
            ],
          },
        ],
      };
    } else if (status === 'all') {
      filter = {
        $or: [
          { dataRemovalRequestStatus: { $in: ['pending', 'approved', 'rejected'] } },
          {
            dataRemovalRequestedAt: { $ne: null },
            dataRemovalRequestReviewedAt: null,
            isDeleted: { $ne: true },
            $or: [
              { dataRemovalRequestStatus: { $exists: false } },
              { dataRemovalRequestStatus: null },
              { dataRemovalRequestStatus: '' },
              { dataRemovalRequestStatus: 'none' },
            ],
          },
        ],
      };
    } else {
      filter = { dataRemovalRequestStatus: status };
    }

    const users = await User.find(filter)
      .select('name email role dataRemovalRequestedAt dataRemovalRequestStatus dataRemovalRequestNote dataRemovalRequestedFinalAction dataRemovalRequestReviewedAt dataRemovalRequestDecisionNote')
      .sort({ dataRemovalRequestedAt: -1 })
      .lean();

    const requests = users.map((item) => ({
      ...item,
      name: displayName(item.name),
    }));

    return res.json({ requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching data removal requests' });
  }
});

router.post('/data-removal-requests/:userId/approve', verifyAdmin, async (req, res) => {
  try {
    await normalizeLegacyDataRemovalRequests();

    const { userId } = req.params;
    const decisionNote = String(req.body?.note || '').trim().slice(0, 1000);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!isLegacyPendingRequest(user)) {
      return res.status(400).json({ message: 'Data removal request is not pending.' });
    }

    const { graceDays, finalAction: envFinalAction } = getAccountDeletionConfig();
    const requestedAction = String(user.dataRemovalRequestedFinalAction || '').trim().toLowerCase();
    const finalAction = requestedAction === 'anonymize' ? 'anonymize' : envFinalAction;
    const now = new Date();
    const scheduledDeletionAt = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);

    user.dataRemovalRequestStatus = 'approved';
    user.dataRemovalRequestReviewedAt = now;
    user.dataRemovalRequestReviewedBy = req.user._id;
    user.dataRemovalRequestDecisionNote = decisionNote;
    user.isDeleted = true;
    user.deletedAt = now;
    user.deletionRequestedAt = user.deletionRequestedAt || user.dataRemovalRequestedAt || now;
    user.scheduledDeletionAt = scheduledDeletionAt;
    user.deletionFinalAction = finalAction;
    user.deletionReason = decisionNote || 'Approved data removal request';
    user.otp = null;
    user.otpExpiry = null;
    user.clearLoginFailures();
    await user.save();

    const notificationSent = await sendDataRemovalDecisionEmailWithTimeout({
      email: user.email,
      name: displayName(user.name) || 'User',
      status: 'approved',
      note: decisionNote,
      scheduledDeletionAt,
      finalAction,
    });

    await logAuditEvent({
      req,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      action: 'ADMIN_APPROVE_DATA_REMOVAL_REQUEST',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
      metadata: { graceDays, finalAction },
    });

    return res.json({
      message: 'Data removal request approved and account scheduled for deletion.',
      scheduledDeletionAt,
      finalAction,
      notificationSent,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error approving data removal request' });
  }
});

router.post('/data-removal-requests/:userId/reject', verifyAdmin, async (req, res) => {
  try {
    await normalizeLegacyDataRemovalRequests();

    const { userId } = req.params;
    const decisionNote = String(req.body?.note || '').trim().slice(0, 1000);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!isLegacyPendingRequest(user)) {
      return res.status(400).json({ message: 'Data removal request is not pending.' });
    }

    user.dataRemovalRequestStatus = 'rejected';
    user.dataRemovalRequestReviewedAt = new Date();
    user.dataRemovalRequestReviewedBy = req.user._id;
    user.dataRemovalRequestDecisionNote = decisionNote;
    await user.save();

    const notificationSent = await sendDataRemovalDecisionEmailWithTimeout({
      email: user.email,
      name: displayName(user.name) || 'User',
      status: 'rejected',
      note: decisionNote,
    });

    await logAuditEvent({
      req,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      action: 'ADMIN_REJECT_DATA_REMOVAL_REQUEST',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
    });

    return res.json({ message: 'Data removal request rejected.', notificationSent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error rejecting data removal request' });
  }
});

router.get('/audit-logs', verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = String(req.query.status || '').trim();
    const action = String(req.query.action || '').trim();

    const filter = {};
    if (status) filter.status = status;
    if (action) filter.action = action;

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

router.get('/analytics-report', verifyToken, async (req, res) => {
  try {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const startOfDay = (input) => {
      if (!input) return null;
      const d = new Date(input);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Count currently approved users as active users
    const activeUsers = await User.countDocuments({ role: { $in: ['user', 'alumni'] }, status: 'approved' });

    // Fetch users we can consider for growth (created or approved), exclude rejected
    const eligibleUsers = await User.find({
      role: { $in: ['user', 'alumni'] },
      status: { $ne: 'rejected' },
    }).select('_id createdAt approvedAt status').lean();
    const totalEligibleUsers = eligibleUsers.length;
    const eligibleUserIds = new Set(eligibleUsers.map((item) => String(item._id)));

    const windowParam = String(req.query.windowDays || '').trim().toLowerCase();
    const wd = parseInt(req.query.windowDays, 10);
    const isAllTime = windowParam === 'all' || windowParam === 'all_time' || windowParam === 'alltime';
    let windowDays;
    let sinceStart;
    let since;
    let windowMode = 'month_to_date';

    let prefetchedAchievement = null;

    if (isAllTime) {
      windowMode = 'all_time';

      const earliestCreatedDoc = await User.findOne({
        role: { $in: ['user', 'alumni'] },
        status: { $ne: 'rejected' },
      }).sort({ createdAt: 1 }).select('createdAt').lean();
      const earliestApprovedDoc = await User.findOne({
        role: { $in: ['user', 'alumni'] },
        status: { $ne: 'rejected' },
        approvedAt: { $exists: true, $ne: null },
      }).sort({ approvedAt: 1 }).select('approvedAt').lean();

      const earliestUserCreated = startOfDay(earliestCreatedDoc?.createdAt);
      const earliestUserApproved = startOfDay(earliestApprovedDoc?.approvedAt);

      prefetchedAchievement = await Achievement.findOne().sort({ updatedAt: -1 }).lean();
      const awardEvents = Array.isArray(prefetchedAchievement?.awardEvents) ? prefetchedAchievement.awardEvents : [];
      const earliestAwardEvent = awardEvents.reduce((earliest, event) => {
        const d = startOfDay(event?.createdAt);
        if (!d) return earliest;
        return !earliest || d < earliest ? d : earliest;
      }, null);
      const earliestFeatured = prefetchedAchievement?.featured ? startOfDay(prefetchedAchievement?.updatedAt) : null;
      const earliest = [earliestUserCreated, earliestUserApproved, earliestAwardEvent, earliestFeatured]
        .filter(Boolean)
        .reduce((minDate, d) => (!minDate || d < minDate ? d : minDate), null);

      const earliestStart = earliest || todayStart;
      const computedDays = Math.max(1, Math.ceil((todayStart.getTime() - earliestStart.getTime()) / dayMs) + 1);
      windowDays = Math.min(computedDays, 3650); // cap to ~10 years to keep payload reasonable
      sinceStart = new Date(todayStart.getTime() - (windowDays - 1) * dayMs);
      since = sinceStart;
    } else if (!Number.isNaN(wd) && wd > 0) {
      windowMode = 'last_n_days';
      windowDays = Math.min(wd, 3650);
      sinceStart = new Date(todayStart.getTime() - (windowDays - 1) * dayMs);
      since = sinceStart;
    } else {
      windowMode = 'month_to_date';
      sinceStart = new Date(now.getFullYear(), now.getMonth(), 1);
      sinceStart.setHours(0, 0, 0, 0);
      since = sinceStart;
      windowDays = Math.max(1, Math.ceil((todayStart.getTime() - sinceStart.getTime()) / dayMs) + 1);
    }

    const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const dailyLabels = Array.from({ length: windowDays }, (_, i) => {
      const d = new Date(sinceStart.getTime() + i * dayMs);
      return dateFormat.format(d);
    });
    const usersCreatedDaily = Array.from({ length: windowDays }, () => 0);
    const usersApprovedDaily = Array.from({ length: windowDays }, () => 0);

    for (const user of eligibleUsers) {
      const createdDay = startOfDay(user?.createdAt);
      if (createdDay && createdDay >= sinceStart && createdDay <= todayStart) {
        const index = Math.floor((createdDay.getTime() - sinceStart.getTime()) / dayMs);
        if (index >= 0 && index < windowDays) usersCreatedDaily[index] += 1;
      }

      const approvedDay = startOfDay(user?.approvedAt);
      if (approvedDay && approvedDay >= sinceStart && approvedDay <= todayStart) {
        const index = Math.floor((approvedDay.getTime() - sinceStart.getTime()) / dayMs);
        if (index >= 0 && index < windowDays) usersApprovedDaily[index] += 1;
      }
    }

    const usersCreatedInWindow = usersCreatedDaily.reduce((sum, value) => sum + value, 0);
    const usersApprovedInWindow = usersApprovedDaily.reduce((sum, value) => sum + value, 0);

    const activeParticipants = await Message.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $project: { participants: ['$sender', '$recipient'] } },
      { $unwind: '$participants' },
      { $group: { _id: '$participants' } },
    ]);

    const engagedUsers = activeParticipants.reduce((count, row) => {
      return eligibleUserIds.has(String(row._id)) ? count + 1 : count;
    }, 0);

    const achievement = prefetchedAchievement || await Achievement.findOne().sort({ updatedAt: -1 }).lean();
    const certificationsCompleted = Number(achievement?.stats?.totalBadgesAwarded || 0);

    const awardEvents = Array.isArray(achievement?.awardEvents) ? achievement.awardEvents : [];
    const awardsAlumniDaily = Array.from({ length: windowDays }, () => 0);
    const awardsEmployeeDaily = Array.from({ length: windowDays }, () => 0);
    for (const event of awardEvents) {
      const eventDay = startOfDay(event?.createdAt);
      if (!eventDay || eventDay < sinceStart || eventDay > todayStart) continue;
      const index = Math.floor((eventDay.getTime() - sinceStart.getTime()) / dayMs);
      if (index < 0 || index >= windowDays) continue;
      const category = String(event?.category || 'alumni').toLowerCase() === 'employee' ? 'employee' : 'alumni';
      if (category === 'employee') awardsEmployeeDaily[index] += 1;
      else awardsAlumniDaily[index] += 1;
    }

    // Backfill legacy data: treat an existing "featured" row as one award event.
    if (awardEvents.length === 0 && achievement?.featured) {
      const fallbackDay = startOfDay(achievement?.updatedAt || now);
      if (fallbackDay && fallbackDay >= sinceStart && fallbackDay <= todayStart) {
        const index = Math.floor((fallbackDay.getTime() - sinceStart.getTime()) / dayMs);
        if (index >= 0 && index < windowDays) awardsAlumniDaily[index] += 1;
      }
    }
    const awardsInWindow = awardsAlumniDaily.reduce((sum, v) => sum + v, 0) + awardsEmployeeDaily.reduce((sum, v) => sum + v, 0);

    const engagementRate = activeUsers > 0
      ? Number(((engagedUsers / activeUsers) * 100).toFixed(1))
      : 0;

    const timelinePoints = 7;
    const timelineLabels = [];
    const userGrowthAdded = Array.from({ length: timelinePoints }, () => 0);
    const userGrowthSeries = Array.from({ length: timelinePoints }, () => 0);
    const userGrowthCumulative = Array.from({ length: timelinePoints }, () => 0);
    const userBucketMs = Math.max(dayMs, (windowDays * dayMs) / timelinePoints);
    // Prefer approvedAt when present otherwise fall back to createdAt for growth events
    const usersBeforeWindow = eligibleUsers.filter((u) => {
      const eventDate = u?.approvedAt ? new Date(u.approvedAt) : (u?.createdAt ? new Date(u.createdAt) : null);
      return eventDate && !Number.isNaN(eventDate.getTime()) && eventDate < since;
    }).length;

    for (const user of eligibleUsers) {
      const eventDate = user?.approvedAt ? new Date(user.approvedAt) : (user?.createdAt ? new Date(user.createdAt) : null);
      if (!eventDate || Number.isNaN(eventDate.getTime()) || eventDate < since || eventDate > now) continue;
      const index = Math.min(
        timelinePoints - 1,
        Math.floor((eventDate.getTime() - since.getTime()) / userBucketMs)
      );
      userGrowthAdded[index] += 1;
    }
    let runningUsers = usersBeforeWindow;
    for (let i = 0; i < timelinePoints; i += 1) {
      runningUsers += userGrowthAdded[i];
      userGrowthSeries[i] = userGrowthAdded[i];
      userGrowthCumulative[i] = runningUsers;

      const labelDate = new Date(since.getTime() + userBucketMs * (i + 1));
      timelineLabels.push(dateFormat.format(labelDate > now ? now : labelDate));
    }

    const certificationBuckets = 5;
    const certificationSeries = Array.from({ length: certificationBuckets }, () => 0);
    const certificationPeriodLabels = [];
    const certificationBucketMs = Math.max(dayMs, (windowDays * dayMs) / certificationBuckets);
    const certificationEvents = Array.isArray(achievement?.certificationEvents)
      ? achievement.certificationEvents
      : [];

    for (let i = 0; i < certificationBuckets; i += 1) {
      const start = new Date(since.getTime() + certificationBucketMs * i);
      const end = new Date(since.getTime() + certificationBucketMs * (i + 1));
      certificationPeriodLabels.push(`${dateFormat.format(start)}-${dateFormat.format(end)}`);
    }

    for (const event of certificationEvents) {
      const eventDate = event?.createdAt ? new Date(event.createdAt) : null;
      if (!eventDate || Number.isNaN(eventDate.getTime()) || eventDate < since || eventDate > now) continue;
      const index = Math.min(
        certificationBuckets - 1,
        Math.floor((eventDate.getTime() - since.getTime()) / certificationBucketMs)
      );
      certificationSeries[index] += Number(event?.quantity || 0);
    }

    if (certificationEvents.length === 0 && certificationsCompleted > 0) {
      const fallbackDate = achievement?.updatedAt ? new Date(achievement.updatedAt) : now;
      const inRangeDate = fallbackDate < since || fallbackDate > now ? now : fallbackDate;
      const index = Math.min(
        certificationBuckets - 1,
        Math.floor((inRangeDate.getTime() - since.getTime()) / certificationBucketMs)
      );
      certificationSeries[index] += certificationsCompleted;
    }

    return res.json({
      activeUsers,
      engagedUsers,
      certificationsCompleted,
      engagementRate,
      windowDays,
      windowMode,
      sinceStart: sinceStart.toISOString(),
      todayStart: todayStart.toISOString(),
      totalEligibleUsers,
      newUsersInWindow: usersCreatedInWindow,
      approvalsInWindow: usersApprovedInWindow,
      dailyLabels,
      usersCreatedDaily,
      usersApprovedDaily,
      awardsAlumniDaily,
      awardsEmployeeDaily,
      awardsInWindow,
      timelineLabels,
      userGrowthSeries,
      userGrowthAdded,
      userGrowthCumulative,
      certificationPeriodLabels,
      certificationSeries,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching analytics report' });
  }
});

router.get('/analytics-report/export', verifyToken, async (req, res) => {
  try {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const startOfDay = (input) => {
      if (!input) return null;
      const d = new Date(input);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const activeUsers = await User.countDocuments({ role: { $in: ['user', 'alumni'] }, status: 'approved' });
    const eligibleUsers = await User.find({
      role: { $in: ['user', 'alumni'] },
      status: { $ne: 'rejected' },
    }).select('_id createdAt approvedAt status').lean();

    const windowParam = String(req.query.windowDays || '').trim().toLowerCase();
    const wd = parseInt(req.query.windowDays, 10);
    const isAllTime = windowParam === 'all' || windowParam === 'all_time' || windowParam === 'alltime';
    let windowDays;
    let sinceStart;
    let since;
    let windowMode = 'month_to_date';
    let prefetchedAchievement = null;

    if (isAllTime) {
      windowMode = 'all_time';

      const earliestCreatedDoc = await User.findOne({
        role: { $in: ['user', 'alumni'] },
        status: { $ne: 'rejected' },
      }).sort({ createdAt: 1 }).select('createdAt').lean();
      const earliestApprovedDoc = await User.findOne({
        role: { $in: ['user', 'alumni'] },
        status: { $ne: 'rejected' },
        approvedAt: { $exists: true, $ne: null },
      }).sort({ approvedAt: 1 }).select('approvedAt').lean();

      const earliestUserCreated = startOfDay(earliestCreatedDoc?.createdAt);
      const earliestUserApproved = startOfDay(earliestApprovedDoc?.approvedAt);

      prefetchedAchievement = await Achievement.findOne().sort({ updatedAt: -1 }).lean();
      const awardEvents = Array.isArray(prefetchedAchievement?.awardEvents) ? prefetchedAchievement.awardEvents : [];
      const earliestAwardEvent = awardEvents.reduce((earliest, event) => {
        const d = startOfDay(event?.createdAt);
        if (!d) return earliest;
        return !earliest || d < earliest ? d : earliest;
      }, null);
      const earliestFeatured = prefetchedAchievement?.featured ? startOfDay(prefetchedAchievement?.updatedAt) : null;
      const earliest = [earliestUserCreated, earliestUserApproved, earliestAwardEvent, earliestFeatured]
        .filter(Boolean)
        .reduce((minDate, d) => (!minDate || d < minDate ? d : minDate), null);

      const earliestStart = earliest || todayStart;
      const computedDays = Math.max(1, Math.ceil((todayStart.getTime() - earliestStart.getTime()) / dayMs) + 1);
      windowDays = Math.min(computedDays, 3650);
      sinceStart = new Date(todayStart.getTime() - (windowDays - 1) * dayMs);
      since = sinceStart;
    } else if (!Number.isNaN(wd) && wd > 0) {
      windowMode = 'last_n_days';
      windowDays = Math.min(wd, 3650);
      sinceStart = new Date(todayStart.getTime() - (windowDays - 1) * dayMs);
      since = sinceStart;
    } else {
      windowMode = 'month_to_date';
      sinceStart = new Date(now.getFullYear(), now.getMonth(), 1);
      sinceStart.setHours(0, 0, 0, 0);
      since = sinceStart;
      windowDays = Math.max(1, Math.ceil((todayStart.getTime() - sinceStart.getTime()) / dayMs) + 1);
    }

    const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const dailyLabels = Array.from({ length: windowDays }, (_, i) => {
      const d = new Date(sinceStart.getTime() + i * dayMs);
      return dateFormat.format(d);
    });

    const usersCreatedDaily = Array.from({ length: windowDays }, () => 0);
    const usersApprovedDaily = Array.from({ length: windowDays }, () => 0);
    for (const user of eligibleUsers) {
      const createdDay = startOfDay(user?.createdAt);
      if (createdDay && createdDay >= sinceStart && createdDay <= todayStart) {
        const index = Math.floor((createdDay.getTime() - sinceStart.getTime()) / dayMs);
        if (index >= 0 && index < windowDays) usersCreatedDaily[index] += 1;
      }
      const approvedDay = startOfDay(user?.approvedAt);
      if (approvedDay && approvedDay >= sinceStart && approvedDay <= todayStart) {
        const index = Math.floor((approvedDay.getTime() - sinceStart.getTime()) / dayMs);
        if (index >= 0 && index < windowDays) usersApprovedDaily[index] += 1;
      }
    }

    const achievement = prefetchedAchievement || await Achievement.findOne().sort({ updatedAt: -1 }).lean();
    const awardEvents = Array.isArray(achievement?.awardEvents) ? achievement.awardEvents : [];
    const awardsAlumniDaily = Array.from({ length: windowDays }, () => 0);
    const awardsEmployeeDaily = Array.from({ length: windowDays }, () => 0);
    for (const event of awardEvents) {
      const eventDay = startOfDay(event?.createdAt);
      if (!eventDay || eventDay < sinceStart || eventDay > todayStart) continue;
      const index = Math.floor((eventDay.getTime() - sinceStart.getTime()) / dayMs);
      if (index < 0 || index >= windowDays) continue;
      const category = String(event?.category || 'alumni').toLowerCase() === 'employee' ? 'employee' : 'alumni';
      if (category === 'employee') awardsEmployeeDaily[index] += 1;
      else awardsAlumniDaily[index] += 1;
    }
    if (awardEvents.length === 0 && achievement?.featured) {
      const fallbackDay = startOfDay(achievement?.updatedAt || now);
      if (fallbackDay && fallbackDay >= sinceStart && fallbackDay <= todayStart) {
        const index = Math.floor((fallbackDay.getTime() - sinceStart.getTime()) / dayMs);
        if (index >= 0 && index < windowDays) awardsAlumniDaily[index] += 1;
      }
    }

    const usersCreatedInWindow = usersCreatedDaily.reduce((sum, value) => sum + value, 0);
    const usersApprovedInWindow = usersApprovedDaily.reduce((sum, value) => sum + value, 0);
    const awardsAlumniInWindow = awardsAlumniDaily.reduce((sum, value) => sum + value, 0);
    const awardsEmployeeInWindow = awardsEmployeeDaily.reduce((sum, value) => sum + value, 0);
    const awardsInWindow = awardsAlumniInWindow + awardsEmployeeInWindow;
    const certificationsCompleted = Number(achievement?.stats?.totalBadgesAwarded || 0);

    const rows = [];
    rows.push(['HSI Alumni Portal Analytics Report']);
    rows.push([`Generated`, now.toISOString()]);
    rows.push([`Window Mode`, windowMode]);
    rows.push([`Since`, sinceStart.toISOString()]);
    rows.push([`Through`, todayStart.toISOString()]);
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Active Users', activeUsers]);
    rows.push(['Users Created (window)', usersCreatedInWindow]);
    rows.push(['Users Approved (window)', usersApprovedInWindow]);
    rows.push(['Awards Alumni (window)', awardsAlumniInWindow]);
    rows.push(['Awards Employee (window)', awardsEmployeeInWindow]);
    rows.push(['Awards Total (window)', awardsInWindow]);
    rows.push(['Certifications Completed (total)', certificationsCompleted]);
    rows.push([]);
    rows.push(['Daily']);
    rows.push(['Date', 'Users Created', 'Users Approved', 'Awards Alumni', 'Awards Employee', 'Awards Total']);
    for (let i = 0; i < windowDays; i += 1) {
      const dateLabel = dailyLabels[i] || '';
      const created = usersCreatedDaily[i] || 0;
      const approved = usersApprovedDaily[i] || 0;
      const alumni = awardsAlumniDaily[i] || 0;
      const employee = awardsEmployeeDaily[i] || 0;
      rows.push([dateLabel, created, approved, alumni, employee, alumni + employee]);
    }

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const s = String(value);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = '\ufeff' + rows.map((row) => row.map(escapeCsv).join(',')).join('\n') + '\n';
    const filename = `analytics-report-${todayStart.toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error exporting analytics report' });
  }
});


// Alumni endpoints
router.post('/create-alumni', verifyAdmin, async (req, res) => {
  try {
    const { fullName, email, graduationYear, major, company, jobTitle } = req.body;

    if (!fullName || !email || !graduationYear || !major) {
      return res.status(400).json({ message: 'Name, Email, Graduation Year, and Major are required' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const newAlumni = new User({
      name: fullName,
      email,
      role: 'alumni',
      status: 'approved',
      provider: 'local',
      password: null,
      graduationYear,
      major,
      company: company || '',
      jobTitle: jobTitle || '',
    });

    await newAlumni.save();

    res.status(201).json({
      message: 'Alumni member added successfully',
      alumni: {
        id: newAlumni._id,
        name: newAlumni.name,
        email: newAlumni.email,
        role: newAlumni.role,
        graduationYear: newAlumni.graduationYear,
        major: newAlumni.major,
        company: newAlumni.company,
        jobTitle: newAlumni.jobTitle,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating alumni member' });
  }
});


router.get('/all-alumni', verifyAdmin, async (req, res) => {
  try {
    const alumni = await User.find({ role: 'alumni' })
      .select('-password -otp -otpExpiry -failedLoginAttempts -lastFailedLoginAt -lockUntil -emailHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ alumni: alumni.map(normalizeUserRecord) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching alumni' });
  }
});


router.post('/delete-alumni/:alumniId', verifyAdmin, async (req, res) => {
  try {
    const { alumniId } = req.params;

    const alumni = await User.findById(alumniId);
    if (!alumni) {
      return res.status(404).json({ message: 'Alumni member not found' });
    }

    await hardDeleteUsersByIds([alumniId]);

    res.json({ message: 'Alumni member deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting alumni member' });
  }
});

// Update alumni member
const updateAlumniHandler = async (req, res) => {
  try {
    const { alumniId } = req.params;
    const { fullName, email, graduationYear, major, company, jobTitle } = req.body;
    const alumni = await User.findById(alumniId).select('-password -otp -otpExpiry -failedLoginAttempts -lastFailedLoginAt -lockUntil -emailHash');

    if (!alumni) {
      return res.status(404).json({ message: 'Alumni member not found' });
    }

    if (typeof email === 'string' && email.trim() && email !== alumni.email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && String(existingEmail._id) !== String(alumni._id)) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      alumni.email = email;
    }

    if (typeof fullName === 'string') alumni.name = fullName;
    if (typeof graduationYear === 'string') alumni.graduationYear = graduationYear;
    if (typeof major === 'string') alumni.major = major;
    if (typeof company === 'string') alumni.company = company;
    if (typeof jobTitle === 'string') alumni.jobTitle = jobTitle;

    await alumni.save();

    res.json({ message: 'Alumni member updated successfully', alumni });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating alumni member' });
  }
};

router.put('/update-alumni/:alumniId', verifyAdmin, updateAlumniHandler);
router.post('/update-alumni/:alumniId', verifyAdmin, updateAlumniHandler);

// Delete user (admin only)
router.post('/delete-user/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    // Super admin can delete any user (except other super admins)
    // Regular admin can only delete regular users
    const userToDelete = await User.findById(userId);
    
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isBasicAdmin = ['admin', 'hr', 'alumni_officer'].includes(requestingUser.role);

    if (isBasicAdmin && userToDelete.role === 'admin') {
      return res.status(403).json({ message: 'Admins cannot delete other admins' });
    }

    if (isBasicAdmin && userToDelete.role === 'super_admin') {
      return res.status(403).json({ message: 'Admins cannot delete super admins' });
    }

    await hardDeleteUsersByIds([userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Update user (admin only)
const updateUserHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role } = req.body;
    const requestingUser = req.user;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle role changes with permission checks
    if (role && role !== user.role) {
      const adminRoles = ['admin', 'hr', 'alumni_officer'];
      const isSuperAdmin = requestingUser.role === 'super_admin';

      // Only super admin can assign super_admin role
      if (role === 'super_admin' && !isSuperAdmin) {
        return res.status(403).json({ message: 'Cannot assign super admin role' });
      }

      if (!isSuperAdmin) {
        const isTargetAdminRole = adminRoles.includes(role);
        const isCurrentAdminRole = adminRoles.includes(user.role);

        // Admins can only switch roles among admin roles
        if (!(isTargetAdminRole && isCurrentAdminRole)) {
          return res.status(403).json({ message: 'Only super admin can change this role' });
        }
      }
    }

    if (typeof email === 'string' && email.trim() && email !== user.email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && String(existingEmail._id) !== String(user._id)) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      user.email = email;
    }

    if (typeof name === 'string') user.name = name;
    if (role) user.role = role;

    await user.save();

    const updatedUser = await User.findById(userId)
      .select('-password -otp -otpExpiry -failedLoginAttempts -lastFailedLoginAt -lockUntil -emailHash')
      .lean();
    res.json({ message: 'User updated successfully', user: normalizeUserRecord(updatedUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating user' });
  }
};

router.put('/update-user/:userId', verifyAdmin, updateUserHandler);
router.post('/update-user/:userId', verifyAdmin, updateUserHandler);

module.exports = router;
