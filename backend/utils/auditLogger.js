const AuditLog = require('../models/AuditLog');

function getClientIp(req) {
  if (!req) return '';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
}

async function logAuditEvent({ req, actorId = null, actorEmail = '', action, entityType = '', entityId = '', status = 'success', metadata = {} }) {
  try {
    if (!action) return;

    await AuditLog.create({
      actorId,
      actorEmail,
      action,
      entityType,
      entityId,
      status,
      metadata,
      ipAddress: getClientIp(req),
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (err) {
    // Never block user flows if audit logging fails.
    console.error('Audit logging failed:', err.message);
  }
}

module.exports = { logAuditEvent, getClientIp };
