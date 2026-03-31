const fs = require('fs');
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
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: options.resourceType || 'auto',
  });

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

