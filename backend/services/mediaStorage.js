const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

let configured = false;

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
  isCloudinaryConfigured,
  uploadLocalFile,
  cleanupLocalFile,
};

