const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const { uploadLocalFile } = require('../services/mediaStorage');

const uploadsRoot = path.join(__dirname, '..', 'uploads');

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  let scannedAnnouncements = 0;
  let migratedAttachments = 0;
  let skippedAttachments = 0;

  try {
    const announcements = await Announcement.find({ 'attachments.url': /^\/uploads\// }).sort({ createdAt: -1 });

    for (const announcement of announcements) {
      scannedAnnouncements += 1;
      let changed = false;

      for (const attachment of announcement.attachments || []) {
        const currentUrl = String(attachment?.url || '').trim();
        if (!currentUrl.startsWith('/uploads/')) continue;

        const fileName = path.basename(currentUrl);
        const localFilePath = path.join(uploadsRoot, fileName);

        if (!fs.existsSync(localFilePath)) {
          skippedAttachments += 1;
          console.warn(`[skip] Missing local file for announcement ${announcement._id}: ${localFilePath}`);
          continue;
        }

        const resourceType = attachment.kind === 'video' ? 'video' : 'image';
        let uploadedUrl = null;
        try {
          uploadedUrl = await uploadLocalFile(localFilePath, {
            folder: 'announcements',
            resourceType,
          });
        } catch (error) {
          skippedAttachments += 1;
          console.warn(`[skip] Upload failed for ${localFilePath}: ${error.message || error}`);
          continue;
        }

        if (!uploadedUrl) {
          skippedAttachments += 1;
          console.warn(`[skip] Cloudinary upload returned no URL for ${localFilePath}`);
          continue;
        }

        attachment.url = uploadedUrl;
        changed = true;
        migratedAttachments += 1;
        console.log(`[migrated] ${announcement._id} -> ${uploadedUrl}`);
      }

      if (changed) {
        await announcement.save();
      }
    }

    console.log(JSON.stringify({
      scannedAnnouncements,
      migratedAttachments,
      skippedAttachments,
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Announcement attachment migration failed:', error);
  process.exit(1);
});