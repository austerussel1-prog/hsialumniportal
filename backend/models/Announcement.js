const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const announcementSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  category: { type: String, default: 'Company News' },
  attachments: [{
    kind: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  hearts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema]
});

module.exports = mongoose.model('Announcement', announcementSchema);
