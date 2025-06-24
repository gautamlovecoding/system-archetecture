const { logger } = require('../utils/logger');

// Socket.IO connection handler
module.exports = (io) => {
  // Chat namespace for messaging
  const chatNamespace = io.of('/chat');
  
  chatNamespace.on('connection', (socket) => {
    logger.info(`User connected to chat: ${socket.id}`);
    
    // Join user to their own room for private messages
    socket.on('join-user-room', (userId) => {
      socket.join(userId.toString());
      logger.info(`User ${userId} joined their room`);
    });
    
    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(data.recipientId).emit('user-typing', {
        senderId: data.senderId,
        isTyping: data.isTyping
      });
    });
    
    // Handle message acknowledgment
    socket.on('message-received', (data) => {
      socket.to(data.senderId).emit('message-delivered', {
        messageId: data.messageId,
        deliveredAt: new Date()
      });
    });
    
    // Handle user status updates
    socket.on('status-update', (data) => {
      socket.broadcast.emit('user-status-changed', {
        userId: data.userId,
        status: data.status // online, away, busy, offline
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected from chat: ${socket.id}`);
    });
  });
  
  // General namespace for notifications and updates
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join user to their notification room
    socket.on('join-notifications', (userId) => {
      socket.join(`notifications-${userId}`);
      logger.info(`User ${userId} joined notifications room`);
    });
    
    // Handle bulk operation updates
    socket.on('join-bulk-updates', (userId) => {
      socket.join(`bulk-${userId}`);
      logger.info(`User ${userId} joined bulk updates room`);
    });
    
    // Handle system-wide announcements
    socket.on('join-announcements', () => {
      socket.join('announcements');
      logger.info(`Client joined announcements room`);
    });
    
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
  
  // Helper functions to emit events from other parts of the application
  const emitToUser = (userId, event, data) => {
    io.to(userId.toString()).emit(event, data);
  };
  
  const emitNotification = (userId, notification) => {
    io.to(`notifications-${userId}`).emit('new-notification', notification);
  };
  
  const emitBulkUpdate = (userId, update) => {
    io.to(`bulk-${userId}`).emit('bulk-progress', update);
  };
  
  const emitAnnouncement = (announcement) => {
    io.to('announcements').emit('system-announcement', announcement);
  };
  
  // Export helper functions for use in other modules
  return {
    emitToUser,
    emitNotification,
    emitBulkUpdate,
    emitAnnouncement
  };
}; 