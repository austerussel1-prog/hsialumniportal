const Notification = require('../models/Notification');

async function createUserNotification({
  recipient,
  kind = 'general',
  source = 'System',
  title = '',
  message,
  level = 'info',
  actionType = 'route',
  actionPath = '',
  metadata = {},
}) {
  const recipientId = String(recipient || '').trim();
  const text = String(message || '').trim();
  if (!recipientId || !text) return null;

  try {
    return await Notification.create({
      recipient: recipientId,
      kind,
      source,
      title: String(title || '').trim(),
      message: text,
      level,
      actionType,
      actionPath: String(actionPath || '').trim(),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
  } catch (err) {
    console.error('[notifications] Failed to create notification:', err.message);
    return null;
  }
}

module.exports = {
  createUserNotification,
};