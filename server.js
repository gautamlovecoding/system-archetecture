const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const { logger } = require('./src/utils/logger');
const { connectDatabase } = require('./src/config/database');
const { setupRedis } = require('./src/config/redis');
const { globalRateLimit } = require('./src/middleware/rateLimiter');
const { globalErrorHandler } = require('./src/middleware/errorHandler');

// Import all routes
const authRoutes = require('./src/routes/authRoutes');
const urlRoutes = require('./src/routes/urlRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const complaintRoutes = require('./src/routes/complaintRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const searchRoutes = require('./src/routes/searchRoutes');
const bulkRoutes = require('./src/routes/bulkRoutes');
const monitoringRoutes = require('./src/routes/monitoringRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store io instance for use in other modules
app.set('io', io);

// Middleware Setup
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors()); // Enable CORS
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Logging
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies
app.use('/uploads', express.static('uploads')); // Serve static files

// Apply global rate limiting
app.use(globalRateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/url', urlRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Socket.IO connection handling
require('./src/services/socketService')(io);

// Error handling middleware (must be last)
app.use(globalErrorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Initialize application
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Setup Redis connection
    await setupRedis();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔗 WebSocket server running on port ${PORT}`);
    });
    
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize the application
initializeApp();

module.exports = { app, server, io }; 