/**
 * KPI Migration Script
 * Run this script to initialize KPI records for all existing users
 * Usage: node scripts/migrateKPI.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const KPI = require('../models/KPI');
const { refreshUserKPI } = require('../services/kpiService');

async function migrateKPI() {
  try {
    console.log('Starting KPI migration...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all approved users
    const users = await User.find({ status: 'approved' });
    console.log(`Found ${users.length} approved users`);

    let created = 0;
    let refreshed = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const existingKPI = await KPI.findOne({ userId: user._id });

        if (!existingKPI) {
          // Create new KPI record and refresh it
          await refreshUserKPI(user._id);
          created += 1;
          console.log(`✓ Created and initialized KPI for user: ${user.name} (${user.email})`);
        } else {
          // Refresh existing KPI
          await refreshUserKPI(user._id);
          refreshed += 1;
          console.log(`✓ Refreshed KPI for user: ${user.name} (${user.email})`);
        }
      } catch (error) {
        errors += 1;
        console.error(`✗ Error processing user ${user.name}: ${error.message}`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total users processed: ${users.length}`);
    console.log(`KPI records created: ${created}`);
    console.log(`KPI records refreshed: ${refreshed}`);
    console.log(`Errors: ${errors}`);
    console.log('Migration completed!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateKPI();
