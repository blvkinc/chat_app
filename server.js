const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? true // Allow all origins in production
      : "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const users = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Send current user list to the newly connected client
  socket.emit('userList', Array.from(users.values()));

  socket.on('join', (username) => {
    console.log('User joined:', username, socket.id);
    users.set(socket.id, username);
    io.emit('userJoined', { id: socket.id, username });
    io.emit('userList', Array.from(users.values()));
  });

  socket.on('message', (data) => {
    console.log('Message received:', data, 'from:', users.get(socket.id));
    io.emit('message', {
      id: socket.id,
      username: users.get(socket.id),
      text: data.text,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      console.log('User disconnected:', username, socket.id);
      users.delete(socket.id);
      io.emit('userLeft', { id: socket.id, username });
      io.emit('userList', Array.from(users.values()));
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connections: io.engine.clientsCount });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 