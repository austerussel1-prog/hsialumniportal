const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

async function main() {
  const idOrEmail = process.argv[2];
  if (!idOrEmail) {
    console.error('Usage: node approveUser.js <userId|email>');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  let query = null;
  if (/^[0-9a-fA-F]{24}$/.test(idOrEmail)) {
    query = { _id: idOrEmail };
  } else {
    query = { email: idOrEmail };
  }

  const user = await User.findOne(query);
  if (!user) {
    console.error('User not found for', idOrEmail);
    process.exit(1);
  }

  user.status = 'approved';
  await user.save();

  console.log('User approved:', { id: user._id.toString(), email: user.email, status: user.status });
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Error approving user:', err);
  process.exit(1);
});
