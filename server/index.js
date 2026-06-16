require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const authRoutes = require('./routes/auth');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: '🚀 NexMeet Server Running', status: 'ok' });
});

// roomId -> Map<socketId, { userId, userName }>
const rooms = {};

function getRoomUsers(roomId) {
  if (!rooms[roomId]) return [];
  return [...rooms[roomId].entries()].map(([socketId, info]) => ({
    socketId,
    userId: info.userId,
    userName: info.userName
  }));
}

io.on('connection', (socket) => {
  console.log('🟢 Connected:', socket.id);

  let currentRoom = null;
  let currentUser = null;

  // ── Join Room ──
  socket.on('join-room', ({ roomId, userId, userName }) => {
    currentRoom = roomId;
    currentUser = { userId, userName };

    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = new Map();
    rooms[roomId].set(socket.id, { userId, userName });

    // Send the newcomer the full list of existing peers (with names)
    const existingPeers = getRoomUsers(roomId).filter(p => p.socketId !== socket.id);
    socket.emit('existing-peers', existingPeers);

    // Tell existing peers a new user joined
    socket.to(roomId).emit('user-joined', {
      userId,
      userName,
      socketId: socket.id
    });

    console.log(`👥 ${userName} joined room "${roomId}" (${rooms[roomId].size} total)`);
  });

  // ── WebRTC Signaling (offer / answer / ICE candidates) ──
  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  // ── Chat ──
  socket.on('chat-message', ({ roomId, message }) => {
    io.to(roomId).emit('chat-message', message);
  });

  // ── Whiteboard draw sync ──
  socket.on('draw', ({ roomId, data }) => {
    socket.to(roomId).emit('draw', data);
  });

  socket.on('clear-board', ({ roomId }) => {
    socket.to(roomId).emit('clear-board');
  });

  // ── File share notification ──
  socket.on('file-shared', ({ roomId, fileInfo }) => {
    socket.to(roomId).emit('file-shared', fileInfo);
  });

  // ── Screen share toggle broadcast ──
  socket.on('screen-share', ({ roomId, sharing }) => {
    socket.to(roomId).emit('screen-share', { socketId: socket.id, sharing });
  });

  // ── Mic / cam state broadcast (so peers see correct icons) ──
  socket.on('media-state', ({ roomId, micOn, camOn }) => {
    socket.to(roomId).emit('media-state', { socketId: socket.id, micOn, camOn });
  });

  // ── Disconnect cleanup ──
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].delete(socket.id);
      socket.to(currentRoom).emit('user-left', socket.id);
      if (rooms[currentRoom].size === 0) delete rooms[currentRoom];
    }
    console.log('🔴 Disconnected:', socket.id, currentUser?.userName || '');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
