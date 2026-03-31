const crypto = require('crypto');

const ENCRYPTION_PREFIX = 'enc:v1';
let cachedKey = null;
let cachedFallbackKeys = null;
let warnedMissingKey = false;

function isHexKey(input) {
  return /^[a-f0-9]{64}$/i.test(input);
}

function getEncryptionKey() {
  if (cachedKey) return cachedKey;

  const raw = String(process.env.DATA_ENCRYPTION_KEY || '').trim();
  if (!raw) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn('[privacy] DATA_ENCRYPTION_KEY is not set. Sensitive fields will be stored as plain text.');
    }
    return null;
  }

  cachedKey = deriveKey(raw);
  return cachedKey;
}

function deriveKey(rawInput) {
  const raw = String(rawInput || '').trim();
  if (!raw) return null;
  if (isHexKey(raw)) return Buffer.from(raw, 'hex');
  const asBase64 = Buffer.from(raw, 'base64');
  if (asBase64.length === 32) return asBase64;
  return crypto.createHash('sha256').update(raw).digest();
}

function getFallbackEncryptionKeys() {
  if (cachedFallbackKeys) return cachedFallbackKeys;
  const raw = String(process.env.DATA_ENCRYPTION_FALLBACK_KEYS || '').trim();
  if (!raw) {
    cachedFallbackKeys = [];
    return cachedFallbackKeys;
  }
  cachedFallbackKeys = raw
    .split(',')
    .map((item) => deriveKey(item))
    .filter(Boolean);
  return cachedFallbackKeys;
}

function hasEncryptionKey() {
  return Boolean(getEncryptionKey());
}

function getEncryptionKeyFingerprint() {
  const key = getEncryptionKey();
  if (!key) return '';
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashLookupValue(value) {
  return crypto.createHash('sha256').update(String(value || '').trim()).digest('hex');
}

function isEncryptedValue(value) {
  return typeof value === 'string' && value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

function encryptField(value) {
  if (value === null || typeof value === 'undefined') return value;
  const text = String(value);
  if (!text) return text;
  if (isEncryptedValue(text)) return text;

  const key = getEncryptionKey();
  if (!key) return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

function decryptField(value) {
  if (value === null || typeof value === 'undefined') return value;
  const text = String(value);
  if (!isEncryptedValue(text)) return text;

  const key = getEncryptionKey();
  if (!key) return text;

  const parts = text.split(':');
  if (parts.length !== 5) return text;

  const iv = Buffer.from(parts[2], 'base64');
  const authTag = Buffer.from(parts[3], 'base64');
  const encrypted = Buffer.from(parts[4], 'base64');

  const keysToTry = [key, ...getFallbackEncryptionKeys()];
  for (const candidate of keysToTry) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', candidate, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (_) {
      // try next candidate key
    }
  }

  console.error('[privacy] Failed to decrypt field value with configured keys');
  return text;
}

module.exports = {
  normalizeEmail,
  hashLookupValue,
  encryptField,
  decryptField,
  isEncryptedValue,
  hasEncryptionKey,
  getEncryptionKeyFingerprint,
};
