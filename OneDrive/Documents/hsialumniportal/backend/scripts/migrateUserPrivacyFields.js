const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const { isEncryptedValue } = require('../utils/fieldEncryption');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function migrate() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({});
  let updated = 0;

  for (const user of users) {
    let changed = false;

    const storedEmail = user.get('email', null, { getters: false });
    const normalizedEmail = normalizeEmail(storedEmail);
    if (normalizedEmail && (isEncryptedValue(storedEmail) || storedEmail !== normalizedEmail)) {
      user.email = normalizedEmail;
      changed = true;
    }

    const storedProfileImage = user.get('profileImage', null, { getters: false });
    if (typeof storedProfileImage === 'string' && storedProfileImage.trim() && !isEncryptedValue(storedProfileImage)) {
      user.profileImage = storedProfileImage;
      changed = true;
    }

    const storedName = user.get('name', null, { getters: false });
    if (typeof storedName === 'string' && storedName.trim() && !isEncryptedValue(storedName)) {
      user.name = storedName;
      changed = true;
    }

    const storedContactNumber = user.get('contactNumber', null, { getters: false });
    if (typeof storedContactNumber === 'string' && storedContactNumber.trim() && !isEncryptedValue(storedContactNumber)) {
      user.contactNumber = storedContactNumber;
      changed = true;
    }

    const storedAddress = user.get('address', null, { getters: false });
    if (typeof storedAddress === 'string' && storedAddress.trim() && !isEncryptedValue(storedAddress)) {
      user.address = storedAddress;
      changed = true;
    }

    if (changed) {
      await user.save();
      updated += 1;
      console.log(`Migrated user ${user._id}`);
    }
  }

  console.log(`Migration complete. Updated ${updated} user(s).`);
  await mongoose.disconnect();
}

migrate().catch(async (err) => {
  console.error('Migration failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
