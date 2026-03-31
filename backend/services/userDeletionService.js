const fs = require('fs');
const path = require('path');
const Message = require('../models/Message');
const FeedbackReview = require('../models/FeedbackReview');
const User = require('../models/User');

function toSafeUploadPath(uploadUrl) {
  const raw = String(uploadUrl || '').trim();
  if (!raw || !raw.startsWith('/uploads/')) return null;

  const uploadsRoot = path.resolve(path.join(__dirname, '..', 'uploads'));
  const resolved = path.resolve(path.join(__dirname, '..', raw.replace(/^\/+/, '')));
  if (!resolved.startsWith(uploadsRoot)) return null;
  return resolved;
}

async function deleteFiles(filePaths) {
  const uniquePaths = Array.from(new Set(filePaths.filter(Boolean)));
  await Promise.all(uniquePaths.map(async (filePath) => {
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      if (err && err.code !== 'ENOENT') {
        console.error('[privacy] Failed to delete user file:', filePath, err.message);
      }
    }
  }));
}

function normalizeUserIds(userIds) {
  if (!Array.isArray(userIds)) return [];
  return Array.from(
    new Set(
      userIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )
  );
}

async function deleteUserRelatedData(userIds) {
  const ids = normalizeUserIds(userIds);
  if (!ids.length) return;

  const relatedMessages = await Message.find({
    $or: [{ sender: { $in: ids } }, { recipient: { $in: ids } }],
  })
    .select('_id imageUrl attachmentUrl')
    .lean();

  const messageIds = relatedMessages.map((item) => item._id);
  const messageFilePaths = relatedMessages.flatMap((item) => [
    toSafeUploadPath(item.imageUrl),
    toSafeUploadPath(item.attachmentUrl),
  ]);

  await Promise.all([
    messageIds.length ? Message.deleteMany({ _id: { $in: messageIds } }) : Promise.resolve(),
    FeedbackReview.deleteMany({
      $or: [{ author: { $in: ids } }, { targetUser: { $in: ids } }],
    }),
    deleteFiles(messageFilePaths),
  ]);
}

async function hardDeleteUsersByIds(userIds) {
  const ids = normalizeUserIds(userIds);
  if (!ids.length) return { deletedUsers: 0 };
  await deleteUserRelatedData(ids);
  const result = await User.deleteMany({ _id: { $in: ids } });
  return { deletedUsers: Number(result?.deletedCount || 0) };
}

async function anonymizeUsersByIds(userIds) {
  const ids = normalizeUserIds(userIds);
  if (!ids.length) return { anonymizedUsers: 0 };

  const anonymizedAt = new Date();
  const users = await User.find({ _id: { $in: ids } }).select('_id').lean();
  if (!users.length) return { anonymizedUsers: 0 };

  const operations = users.map((user) => ({
    updateOne: {
      filter: { _id: user._id },
      update: {
        $set: {
          name: 'Anonymized User',
          email: `anonymized+${String(user._id)}@example.invalid`,
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
          isDeleted: true,
          deletedAt: anonymizedAt,
          deletionRequestedAt: anonymizedAt,
          scheduledDeletionAt: null,
          lastActiveAt: anonymizedAt,
          privacyUpdatedAt: anonymizedAt,
        },
      },
    },
  }));

  const result = await User.bulkWrite(operations, { ordered: false });
  return { anonymizedUsers: Number(result?.modifiedCount || 0) };
}

module.exports = {
  deleteUserRelatedData,
  hardDeleteUsersByIds,
  anonymizeUsersByIds,
};
