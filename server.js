const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const shortid = require('shortid');
const Meeting = require('./models/Meeting');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Connect DB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/videocall';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('MongoDB connected'))
  .catch((err)=> console.error('MongoDB error:', err.message));

// Simple API: create meeting
app.post('/api/meetings', async (req, res) => {
  try {
    const id = shortid.generate();
    const meeting = new Meeting({ meetingId: id, title: req.body.title || 'Untitled Meeting', scheduledFor: req.body.scheduledFor || null });
    await meeting.save();
    res.json({ meetingId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create meeting' });
  }
});

app.get('/api/meetings/:id', async (req, res) => {
  const m = await Meeting.findOne({ meetingId: req.params.id }).lean();
  if (!m) return res.status(404).json({ message: 'Not found' });
  res.json(m);
});

/**
 * Socket.IO signaling & chat
 *
 * Rooms: we use Socket.IO rooms named by meetingId.
 *
 * Events:
 * - join-room: { meetingId, userName }
 *   -> server replies with 'all-users' (array of socketIds)
 *   -> server broadcasts 'user-joined' to others
 * - offer: { to, sdp, from }
 * - answer: { to, sdp, from }
 * - ice-candidate: { to, candidate, from }
 * - chat-message: { meetingId, message, sender, time }
 * - disconnect handling broadcasts 'user-left'
 */

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join-room', ({ meetingId, userName }) => {
    socket.join(meetingId);
    socket.data.userName = userName || 'Anon';
    socket.data.meetingId = meetingId;

    // gather other users
    const clients = Array.from(io.sockets.adapter.rooms.get(meetingId) || []);
    // remove the joining socket (it's present)
    const otherClients = clients.filter(id => id !== socket.id);

    // send list of other users to the joining user
    socket.emit('all-users', otherClients);

    // notify others a user joined
    socket.to(meetingId).emit('user-joined', { socketId: socket.id, userName: socket.data.userName });
  });

  socket.on('offer', ({ to, sdp, from, userName }) => {
    io.to(to).emit('offer', { sdp, from, userName });
  });

  socket.on('answer', ({ to, sdp, from }) => {
    io.to(to).emit('answer', { sdp, from });
  });

  socket.on('ice-candidate', ({ to, candidate, from }) => {
    io.to(to).emit('ice-candidate', { candidate, from });
  });

  socket.on('chat-message', ({ meetingId, message, sender }) => {
    const time = new Date().toISOString();
    io.to(meetingId).emit('chat-message', { message, sender, time });
  });

  socket.on('leave-room', ({ meetingId }) => {
    socket.leave(meetingId);
    socket.to(meetingId).emit('user-left', { socketId: socket.id });
  });

  socket.on('disconnect', () => {
    const meetingId = socket.data.meetingId;
    if (meetingId) {
      socket.to(meetingId).emit('user-left', { socketId: socket.id });
    }
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
    