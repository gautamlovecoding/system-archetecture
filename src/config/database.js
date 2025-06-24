const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// MongoDB connection configuration
const connectDatabase = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/systemdesign_db';
    
    const options = {
      // Connection options for better performance and reliability
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    };

    await mongoose.connect(MONGODB_URI, options);
    
    logger.info(`🍃 MongoDB connected successfully to ${MONGODB_URI}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
    return mongoose.connection;
    
  } catch (error) {
    console.log("🚀⚡👨‍💻🚀 ~ connectDatabase ~ error🚀🔥🚀➢", error)
    logger.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

// Graceful database disconnection
const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed gracefully');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error.message);
    throw error;
  }
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      status: states[state],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  } catch (error) {
    logger.error('Database health check failed:', error.message);
    return { status: 'error', error: error.message };
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth
}; 