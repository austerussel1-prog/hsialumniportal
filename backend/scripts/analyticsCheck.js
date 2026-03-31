const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function run(windowDays = 30) {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
    await mongoose.connect(process.env.MONGODB_URI);
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const since = new Date(now.getTime() - (windowDays - 1) * dayMs);

    const activeUsers = await User.countDocuments({ role: { $in: ['user', 'alumni'] }, status: { $ne: 'rejected' } });

    const eligibleUsers = await User.find({ role: { $in: ['user', 'alumni'] }, status: { $ne: 'rejected' } }).select('_id createdAt status').lean();

    const timelinePoints = 7;
    const userGrowthAdded = Array.from({ length: timelinePoints }, () => 0);
    const userBucketMs = Math.max(dayMs, (windowDays * dayMs) / timelinePoints);

    let usersBeforeWindow = 0;
    for (const u of eligibleUsers) {
      const createdAt = u?.createdAt ? new Date(u.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
      if (createdAt < since) {
        usersBeforeWindow += 1;
        continue;
      }
      if (createdAt > now) continue;
      const index = Math.min(timelinePoints - 1, Math.floor((createdAt.getTime() - since.getTime()) / userBucketMs));
      userGrowthAdded[index] += 1;
    }

    const userGrowthSeries = userGrowthAdded.slice();
    const userGrowthCumulative = [];
    let running = usersBeforeWindow;
    for (let i = 0; i < timelinePoints; i++) {
      running += userGrowthAdded[i];
      userGrowthCumulative.push(running);
    }

    const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const timelineLabels = [];
    for (let i = 0; i < timelinePoints; i++) {
      const labelDate = new Date(since.getTime() + userBucketMs * (i + 1));
      timelineLabels.push(dateFormat.format(labelDate > now ? now : labelDate));
    }

    console.log('windowDays:', windowDays);
    console.log('since:', since.toISOString());
    console.log('now:', now.toISOString());
    console.log('activeUsers:', activeUsers);
    console.log('usersBeforeWindow:', usersBeforeWindow);
    console.log('timelineLabels:', timelineLabels);
    console.log('userGrowthAdded:', userGrowthAdded);
    console.log('userGrowthCumulative:', userGrowthCumulative);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

const arg = process.argv[2] ? parseInt(process.argv[2], 10) : 30;
run(arg);
