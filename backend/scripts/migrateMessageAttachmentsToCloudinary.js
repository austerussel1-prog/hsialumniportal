const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Message = require('../models/Message');
const { uploadLocalFile } = require('../services/mediaStorage');

const uploadsDir = path.join(__dirname, '..', 'uploads', 'messages');

function inferResourceType(message) {
  const mimeType = String(message?.attachmentMimeType || message?.imageMimeType || '').toLowerCase();
  const originalName = String(message?.attachmentOriginalName || message?.imageOriginalName || '').toLowerCase();

  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|svg|avif)$/i.test(originalName)) {
    return 'image';
  }

  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/') || /\.(mp4|mov|m4v|avi|webm|mp3|wav|ogg)$/i.test(originalName)) {
    return 'video';
  }

  return 'raw';
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const messages = await Message.find({
    attachmentUrl: /^\/uploads\/messages\//,
  }).sort({ createdAt: 1 });

  let migrated = 0;
  let skippedMissing = 0;
  let failed = 0;

  for (const message of messages) {
    const localRelativePath = String(message.attachmentUrl || '').replace(/^\/+/, '');
    const fileName = path.basename(localRelativePath);
    const localFilePath = path.join(uploadsDir, fileName);

    if (!fs.existsSync(localFilePath)) {
      skippedMissing += 1;
      console.warn(`[skip:missing] ${message._id} -> ${localFilePath}`);
      continue;
    }

    try {
      const remoteUrl = await uploadLocalFile(localFilePath, {
        folder: 'messages',
        resourceType: inferResourceType(message),
      });

      if (!remoteUrl) {
        failed += 1;
        console.warn(`[fail:no-url] ${message._id} -> ${localFilePath}`);
        continue;
      }

      message.attachmentUrl = remoteUrl;
      if (String(message.imageUrl || '').trim() === `/uploads/messages/${fileName}`) {
        message.imageUrl = remoteUrl;
      }

      await message.save();
      migrated += 1;
      console.log(`[migrated] ${message._id} -> ${remoteUrl}`);
    } catch (error) {
      failed += 1;
      console.error(`[fail:error] ${message._id} -> ${error.message}`);
    }
  }

  console.log(JSON.stringify({
    total: messages.length,
    migrated,
    skippedMissing,
    failed,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});