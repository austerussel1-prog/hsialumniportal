const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');


    const existingAdmin = await User.findByEmail('admin@hsialumni.com');
    if (existingAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }


    const superAdmin = new User({
      name: 'Russel D. Auste',
      email: 'russeldauste.hs@gmail.com',
      password: '1004200107Rr!', 
      role: 'super_admin',
      status: 'approved',
    });

    await superAdmin.save();
    console.log('Super admin created successfully!');
    console.log('Email: russeldauste.hs@gmail.com');
    console.log('Password: 1004200107Rr!');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

    process.exit(0);
  } catch (err) {
    console.error('Error creating super admin:', err);
    process.exit(1);
  }
}

createSuperAdmin();
