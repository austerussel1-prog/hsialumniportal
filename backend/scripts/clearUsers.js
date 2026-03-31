require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await User.deleteMany({ role: 'user' });
    console.log(`Deleted user accounts: ${result.deletedCount}`);
  } catch (err) {
    console.error('Failed to clear users:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
