const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

let configured = false;
const CLOUDINARY_RESOURCE_TYPES = new Set(['image', 'raw', 'video']);

function isRemoteFileUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function isCloudinaryDeliveryUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return /(^|\.)cloudinary\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
  );
}

function ensureCloudinaryConfigured() {
  if (configured || !isCloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

function extractCloudinaryAssetInfo(fileUrl) {
  if (!isCloudinaryDeliveryUrl(fileUrl)) return null;

  let parsed;
  try {
    parsed = new URL(fileUrl);
  } catch {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const resourceIndex = segments.findIndex((segment) => CLOUDINARY_RESOURCE_TYPES.has(segment));
  if (resourceIndex < 0 || segments.length < resourceIndex + 3) return null;

  const resourceType = segments[resourceIndex];
  const deliveryType = segments[resourceIndex + 1] || 'upload';
  const trailingSegments = segments.slice(resourceIndex + 2);
  const versionIndex = trailingSegments.findIndex((segment) => /^v\d+$/.test(segment));
  const publicSegments = versionIndex >= 0 ? trailingSegments.slice(versionIndex + 1) : trailingSegments;
  if (!publicSegments.length) return null;

  const publicIdWithExtension = publicSegments.join('/');
  const extension = String(path.extname(publicIdWithExtension) || '').replace(/^\./, '').toLowerCase();
  const publicId = resourceType === 'raw' || !extension
    ? publicIdWithExtension
    : publicIdWithExtension.slice(0, -(extension.length + 1));

  return {
    publicId,
    format: extension || undefined,
    resourceType,
    deliveryType,
  };
}

function buildCloudinaryDownloadUrl(fileUrl) {
  if (!isCloudinaryConfigured()) return null;

  const assetInfo = extractCloudinaryAssetInfo(fileUrl);
  if (!assetInfo) return null;

  ensureCloudinaryConfigured();
  return cloudinary.utils.private_download_url(assetInfo.publicId, assetInfo.format, {
    resource_type: assetInfo.resourceType,
    type: assetInfo.deliveryType,
    attachment: false,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });
}

async function fetchRemoteFile(fileUrl) {
  if (!isRemoteFileUrl(fileUrl)) return null;

  const response = await fetch(fileUrl, { redirect: 'follow' });
  if (response.ok) return response;

  if (![401, 403].includes(response.status) || !isCloudinaryDeliveryUrl(fileUrl)) {
    return response;
  }

  const signedDownloadUrl = buildCloudinaryDownloadUrl(fileUrl);
  if (!signedDownloadUrl) return response;

  return fetch(signedDownloadUrl, { redirect: 'follow' });
}

async function uploadLocalFile(filePath, options = {}) {
  if (!filePath || !isCloudinaryConfigured()) return null;
  ensureCloudinaryConfigured();

  const folder = options.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || 'hsialumniportal';
  const resourceType = options.resourceType || 'auto';
  const extension = String(path.extname(filePath) || '').toLowerCase();
  const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  const shouldUseLargeUpload = resourceType === 'video'
    || fileSize >= 100 * 1024 * 1024
    || ['.mp4', '.mov', '.m4v', '.avi', '.webm'].includes(extension);

  const uploadOptions = {
    folder,
    resource_type: resourceType,
  };

  const result = shouldUseLargeUpload
    ? await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(filePath, {
        ...uploadOptions,
        chunk_size: 6 * 1024 * 1024,
      }, (error, value) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(value);
      });
    })
    : await cloudinary.uploader.upload(filePath, uploadOptions);

  return result?.secure_url || null;
}

function cleanupLocalFile(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
}

module.exports = {
  fetchRemoteFile,
  isCloudinaryConfigured,
  isRemoteFileUrl,
  uploadLocalFile,
  cleanupLocalFile,
};

