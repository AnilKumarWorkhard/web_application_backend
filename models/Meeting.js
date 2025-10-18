const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  meetingId: { type: String, required: true, unique: true },
  title: { type: String, default: 'Untitled Meeting' },
  createdAt: { type: Date, default: Date.now },
  scheduledFor: { type: Date, default: null }
});

module.exports = mongoose.model('Meeting', MeetingSchema);
