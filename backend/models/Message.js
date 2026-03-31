const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, trim: true, default: '' },
  imageUrl: { type: String, default: '' },
  imageMimeType: { type: String, default: '' },
  imageOriginalName: { type: String, default: '' },
  attachmentUrl: { type: String, default: '' },
  attachmentMimeType: { type: String, default: '' },
  attachmentOriginalName: { type: String, default: '' },
  attachmentSize: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.pre('validate', function ensureMessageHasContent() {
  const hasText = typeof this.text === 'string' && this.text.trim().length > 0;
  const hasImage = typeof this.imageUrl === 'string' && this.imageUrl.trim().length > 0;
  const hasAttachment = typeof this.attachmentUrl === 'string' && this.attachmentUrl.trim().length > 0;
  if (!hasText && !hasImage && !hasAttachment) {
    this.invalidate('text', 'Message must include text, an image, or a file.');
  }
});

module.exports = mongoose.model('Message', messageSchema);
