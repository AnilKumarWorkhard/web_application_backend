const mongoose = require('mongoose');
const Meeting = require('../../models/Meeting');

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

  const { id } = req.query;
  const m = await Meeting.findOne({ meetingId: id }).lean();
  if (!m) return res.status(404).json({ message: 'Not found' });
  res.status(200).json(m);
};