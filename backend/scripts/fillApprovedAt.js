const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set in .env');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({ status: 'approved', $or: [{ approvedAt: { $exists: false } }, { approvedAt: null }] }).lean();
    console.log('Users to update:', users.length);
    let updated = 0;
    for (const u of users) {
      const createdAt = u?.createdAt ? new Date(u.createdAt) : new Date();
      await User.updateOne({ _id: u._id }, { $set: { approvedAt: createdAt } });
      updated += 1;
    }
    console.log(`Updated ${updated} users`);
    mongoose.disconnect();
  } catch (err) {
    console.error('Error running script', err);
    process.exit(1);
  }
}

run();
