const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

// Import routes
const downloadRoutes = require('./routes/download');
const videoRoutes = require('./routes/video');
const systemRoutes = require('./routes/system');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for downloads
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/download', downloadRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/system', systemRoutes);

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`PNUTDownloader Web Server running on port ${PORT}`);
  
  // Ensure downloads directory exists
  const downloadsDir = path.join(__dirname, 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.ensureDirSync(downloadsDir);
  }
});
