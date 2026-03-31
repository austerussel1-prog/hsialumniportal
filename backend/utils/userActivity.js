const User = require('../models/User');

async function touchUserActivity(userId, options = {}) {
  if (!userId) return;

  const now = new Date();
  const shouldMarkLogin = Boolean(options && options.login);
  const $set = shouldMarkLogin
    ? { lastActiveAt: now, lastLoginAt: now }
    : { lastActiveAt: now };

  try {
    await User.updateOne({ _id: userId }, { $set });
  } catch (err) {
    console.error('[privacy] Failed to update last activity timestamp:', err.message);
  }
}

module.exports = {
  touchUserActivity,
};
