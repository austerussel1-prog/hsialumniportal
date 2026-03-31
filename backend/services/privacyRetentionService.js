const AuditLog = require('../models/AuditLog');
const FeedbackReview = require('../models/FeedbackReview');
const Message = require('../models/Message');
const User = require('../models/User');
const { hardDeleteUsersByIds, anonymizeUsersByIds } = require('./userDeletionService');
const fs = require('fs');
const path = require('path');

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function parseRetentionDays(envName, fallback) {
  const value = parseInt(process.env[envName] || String(fallback), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseBoolean(envName, fallback) {
  const raw = String(process.env[envName] || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return fallback;
}

function toSafeUploadPath(uploadUrl) {
  const raw = String(uploadUrl || '').trim();
  if (!raw || !raw.startsWith('/uploads/')) return null;

  const uploadsRoot = path.resolve(path.join(__dirname, '..', 'uploads'));
  const resolved = path.resolve(path.join(__dirname, '..', raw.replace(/^\/+/, '')));
  if (!resolved.startsWith(uploadsRoot)) return null;
  return resolved;
}

async function deleteFiles(filePaths) {
  let deletedCount = 0;
  const uniquePaths = Array.from(new Set(filePaths.filter(Boolean)));

  await Promise.all(uniquePaths.map(async (filePath) => {
    try {
      await fs.promises.unlink(filePath);
      deletedCount += 1;
    } catch (err) {
      if (err && err.code !== 'ENOENT') {
        console.error('[privacy] Failed to delete retained file:', filePath, err.message);
      }
    }
  }));

  return deletedCount;
}

function buildInactiveProfileQuery(cutoffDate) {
  return {
    isAnonymized: { $ne: true },
    isDeleted: { $ne: true },
    role: { $in: ['user', 'alumni'] },
    $expr: {
      $lt: [
        {
          $ifNull: [
            '$lastActiveAt',
            {
              $ifNull: [
                '$lastLoginAt',
                {
                  $ifNull: [
                    '$privacyUpdatedAt',
                    '$createdAt',
                  ],
                },
              ],
            },
          ],
        },
        cutoffDate,
      ],
    },
  };
}

async function anonymizeInactiveProfiles(cutoffDate) {
  const inactiveUsers = await User.find(buildInactiveProfileQuery(cutoffDate))
    .select('_id role')
    .lean();

  if (!inactiveUsers.length) {
    return { anonymizedProfiles: 0 };
  }

  const anonymizedAt = new Date();
  const operations = inactiveUsers.map((user) => {
    const anonymizedEmail = `anonymized+${String(user._id)}@example.invalid`;
    return {
      updateOne: {
        filter: { _id: user._id, isAnonymized: { $ne: true } },
        update: {
          $set: {
            name: 'Anonymized User',
            email: anonymizedEmail,
            username: null,
            password: null,
            googleId: null,
            contactNumber: null,
            address: null,
            company: '',
            jobTitle: '',
            languages: '',
            education: '',
            skills: '',
            bio: '',
            bio2: '',
            profileImage: '',
            linkedinUrl: '',
            twitterUrl: '',
            instagramUrl: '',
            projects: [],
            careerDocuments: [],
            twoFactorEnabled: false,
            loginAlerts: false,
            profileVisibility: 'private',
            consent: {
              termsAccepted: false,
              privacyAccepted: false,
              termsVersion: '',
              privacyVersion: '',
              acceptedAt: null,
              source: 'unknown',
              ipAddress: '',
              userAgent: '',
            },
            otp: null,
            otpExpiry: null,
            failedLoginAttempts: 0,
            lastFailedLoginAt: null,
            lockUntil: null,
            isAnonymized: true,
            anonymizedAt,
            lastActiveAt: anonymizedAt,
            privacyUpdatedAt: anonymizedAt,
          },
        },
      },
    };
  });

  const result = await User.bulkWrite(operations, { ordered: false });
  return { anonymizedProfiles: Number(result?.modifiedCount || 0) };
}

async function purgeOldMessages(cutoffDate) {
  const expiredMessages = await Message.find({ createdAt: { $lt: cutoffDate } })
    .select('_id imageUrl attachmentUrl')
    .lean();

  if (!expiredMessages.length) {
    return { deletedMessages: 0, deletedMessageFiles: 0 };
  }

  const messageIds = expiredMessages.map((item) => item._id);
  const filePaths = expiredMessages.flatMap((item) => [
    toSafeUploadPath(item.imageUrl),
    toSafeUploadPath(item.attachmentUrl),
  ]);

  const [deleteResult, deletedMessageFiles] = await Promise.all([
    Message.deleteMany({ _id: { $in: messageIds } }),
    deleteFiles(filePaths),
  ]);

  return {
    deletedMessages: Number(deleteResult?.deletedCount || 0),
    deletedMessageFiles,
  };
}

async function finalizeSoftDeletedAccounts(nowDate) {
  const due = await User.find({
    isDeleted: true,
    scheduledDeletionAt: { $ne: null, $lte: nowDate },
  })
    .select('_id deletionFinalAction')
    .lean();

  if (!due.length) {
    return { finalizedSoftDeleted: 0, hardDeletedUsers: 0, anonymizedUsers: 0 };
  }

  const idsForHardDelete = [];
  const idsForAnonymize = [];
  due.forEach((user) => {
    if (String(user.deletionFinalAction || '').toLowerCase() === 'anonymize') {
      idsForAnonymize.push(String(user._id));
    } else {
      idsForHardDelete.push(String(user._id));
    }
  });

  const [hardDeleteSummary, anonymizeSummary] = await Promise.all([
    idsForHardDelete.length
      ? hardDeleteUsersByIds(idsForHardDelete)
      : Promise.resolve({ deletedUsers: 0 }),
    idsForAnonymize.length
      ? anonymizeUsersByIds(idsForAnonymize)
      : Promise.resolve({ anonymizedUsers: 0 }),
  ]);

  const hardDeletedUsers = Number(hardDeleteSummary?.deletedUsers || 0);
  const anonymizedUsers = Number(anonymizeSummary?.anonymizedUsers || 0);

  return {
    finalizedSoftDeleted: hardDeletedUsers + anonymizedUsers,
    hardDeletedUsers,
    anonymizedUsers,
  };
}

async function runDataRetentionJob(reason = 'scheduled') {
  const now = Date.now();
  const retentionAuditDays = parseRetentionDays('RETENTION_AUDIT_LOG_DAYS', 90);
  const retentionFeedbackDays = parseRetentionDays('RETENTION_FEEDBACK_DAYS', 730);
  const retentionMessageDays = parseRetentionDays('RETENTION_MESSAGES_DAYS', 365);
  const retentionProfileInactivityDays = parseRetentionDays('RETENTION_PROFILE_INACTIVITY_DAYS', 365);
  const retentionLoginFailureDays = parseRetentionDays('RETENTION_LOGIN_FAILURE_DAYS', 90);
  const anonymizeInactiveProfilesEnabled = parseBoolean('RETENTION_ANONYMIZE_INACTIVE_PROFILES', true);

  const auditCutoff = new Date(now - retentionAuditDays * DAY_MS);
  const feedbackCutoff = new Date(now - retentionFeedbackDays * DAY_MS);
  const messagesCutoff = new Date(now - retentionMessageDays * DAY_MS);
  const profileInactivityCutoff = new Date(now - retentionProfileInactivityDays * DAY_MS);
  const loginFailureCutoff = new Date(now - retentionLoginFailureDays * DAY_MS);
  const nowDate = new Date(now);

  const [
    auditResult,
    feedbackResult,
    messageSummary,
    inactiveProfileSummary,
    softDeleteSummary,
    otpResetResult,
    unlockResult,
    staleFailureResetResult,
  ] = await Promise.all([
    AuditLog.deleteMany({ createdAt: { $lt: auditCutoff } }),
    FeedbackReview.deleteMany({ createdAt: { $lt: feedbackCutoff } }),
    purgeOldMessages(messagesCutoff),
    anonymizeInactiveProfilesEnabled
      ? anonymizeInactiveProfiles(profileInactivityCutoff)
      : Promise.resolve({ anonymizedProfiles: 0 }),
    finalizeSoftDeletedAccounts(nowDate),
    User.updateMany(
      { otpExpiry: { $lt: nowDate } },
      { $set: { otp: null, otpExpiry: null } }
    ),
    User.updateMany(
      { lockUntil: { $lt: nowDate } },
      { $set: { lockUntil: null } }
    ),
    User.updateMany(
      {
        lastFailedLoginAt: { $lt: loginFailureCutoff },
        failedLoginAttempts: { $gt: 0 },
      },
      { $set: { failedLoginAttempts: 0, lastFailedLoginAt: null, lockUntil: null } }
    ),
  ]);

  const summary = {
    reason,
    deletedAuditLogs: Number(auditResult?.deletedCount || 0),
    deletedFeedbackReviews: Number(feedbackResult?.deletedCount || 0),
    deletedMessages: Number(messageSummary?.deletedMessages || 0),
    deletedMessageFiles: Number(messageSummary?.deletedMessageFiles || 0),
    anonymizedInactiveProfiles: Number(inactiveProfileSummary?.anonymizedProfiles || 0),
    finalizedSoftDeletedAccounts: Number(softDeleteSummary?.finalizedSoftDeleted || 0),
    hardDeletedSoftDeletedAccounts: Number(softDeleteSummary?.hardDeletedUsers || 0),
    anonymizedSoftDeletedAccounts: Number(softDeleteSummary?.anonymizedUsers || 0),
    clearedExpiredOtps: Number(otpResetResult?.modifiedCount || 0),
    unlockedExpiredAccounts: Number(unlockResult?.modifiedCount || 0),
    resetStaleLoginFailures: Number(staleFailureResetResult?.modifiedCount || 0),
    retentionAuditDays,
    retentionFeedbackDays,
    retentionMessageDays,
    retentionProfileInactivityDays,
    retentionLoginFailureDays,
    anonymizeInactiveProfilesEnabled,
  };

  console.log('[privacy] Data retention job complete:', summary);
  return summary;
}

function scheduleDataRetentionJob() {
  const intervalHours = parseRetentionDays('RETENTION_JOB_INTERVAL_HOURS', 24);
  const intervalMs = Math.max(1, intervalHours) * HOUR_MS;
  const initialDelayMs = 2 * 60 * 1000;

  setTimeout(() => {
    runDataRetentionJob('startup').catch((err) => {
      console.error('[privacy] Initial retention job failed:', err);
    });
  }, initialDelayMs);

  setInterval(() => {
    runDataRetentionJob('scheduled').catch((err) => {
      console.error('[privacy] Scheduled retention job failed:', err);
    });
  }, intervalMs);
}

module.exports = {
  runDataRetentionJob,
  scheduleDataRetentionJob,
};
