const mongoose = require('mongoose');
const shortid = require('shortid');
const Meeting = require('../models/Meeting');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/videocall';
let conn = null;

async function connectDB() {
  if (conn == null) {
    conn = await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  }
  return conn;
}

module.exports = async (req, res) => {
  await connectDB();

  if (req.method === 'POST') {
    try {
      const id = shortid.generate();
      const meeting = new Meeting({
        meetingId: id,
        title: req.body.title || 'Untitled Meeting',
        scheduledFor: req.body.scheduledFor || null
      });
      await meeting.save();
      res.status(200).json({ meetingId: id });
    } catch (err) {
      res.status(500).json({ error: 'Could not create meeting' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};