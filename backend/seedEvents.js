const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

async function seedEvents() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await Event.countDocuments();
  if (existing > 0) {
    console.log('Events already exist in the database — skipping seeding.');
    process.exit(0);
  }

  const now = new Date();
  const events = [
    {
      title: 'Tech Summit 2026',
      description: 'A day of talks and panels on modern web and AI technologies.',
      category: 'Tech Talks',
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 14, 0),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 17, 0),
      isVirtual: false,
      location: 'Convention Center',
      capacity: 200,
      image: '/uploads/1771996951522-763328339-samplepic1.avif'
    },
    {
      title: 'Alumni Reunion — Class of 2016',
      description: 'Reconnect with your classmates for an evening of dinner and memories.',
      category: 'Alumni Reunion',
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21, 19, 0),
      isVirtual: false,
      location: 'Grand Ballroom',
      capacity: 120,
      image: '/uploads/1771996951522-763328339-samplepic1.avif'
    },
    {
      title: 'Career Fair — Spring 2026',
      description: 'Meet employers and find your next opportunity.',
      category: 'Career Fairs',
      startDate: new Date(now.getFullYear(), now.getMonth() + 1, 10, 10, 0),
      isVirtual: false,
      location: 'Expo Hall',
      capacity: 500,
      image: '/uploads/1771996951522-763328339-samplepic1.avif'
    },
    {
      title: 'Webinar: Building Inclusive Teams',
      description: 'Practical strategies for inclusive hiring and team dynamics.',
      category: 'Webinar',
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 18, 0),
      isVirtual: true,
      virtualLink: 'https://zoom.example.com/j/123456789',
      capacity: 1000,
      image: '/uploads/1771996951522-763328339-samplepic1.avif'
    }
  ];

  try {
    await Event.insertMany(events);
    console.log('Seeded events successfully');
  } catch (err) {
    console.error('Error seeding events:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

seedEvents();
