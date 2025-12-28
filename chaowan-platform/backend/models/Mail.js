// backend/models/Mail.js
const mongoose = require('mongoose');

const MailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['system', 'transfer', 'activity', 'reward'],
    default: 'system'
  },
  content: String,
  rewards: {
    points: { type: Number, default: 0 },
    starcoin: { type: Number, default: 0 },
    cash: { type: Number, default: 0 }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isClaimed: {
    type: Boolean,
    default: false
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Mail', MailSchema);
