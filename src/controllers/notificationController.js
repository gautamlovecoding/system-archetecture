const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSuccessResponse, sendErrorResponse, catchAsync } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Send notification
const sendNotification = catchAsync(async (req, res) => {
  const { recipients, type, template, subject, message, data = {}, priority = 'normal' } = req.body;
  
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return sendErrorResponse(res, 400, 'Recipients array is required');
  }
  
  if (!type || !['email', 'sms', 'push'].includes(type)) {
    return sendErrorResponse(res, 400, 'Valid notification type is required (email, sms, push)');
  }
  
  if (!message) {
    return sendErrorResponse(res, 400, 'Message is required');
  }
  
  const notifications = [];
  
  // Create notifications for each recipient
  for (const recipientData of recipients) {
    let recipientId;
    
    // Support both user ID and email
    if (typeof recipientData === 'string') {
      if (recipientData.includes('@')) {
        // It's an email, find user by email
        const user = await User.findOne({ email: recipientData });
        if (!user) {
          logger.warn('Notification recipient not found:', { email: recipientData });
          continue;
        }
        recipientId = user._id;
      } else {
        // Assume it's a user ID
        recipientId = recipientData;
      }
    } else {
      recipientId = recipientData;
    }
    
    const notificationData = {
      recipient: recipientId,
      type,
      template: template || 'default',
      message,
      data,
      priority
    };
    
    if (type === 'email' && subject) {
      notificationData.subject = subject;
    }
    
    const notification = await Notification.create(notificationData);
    notifications.push(notification);
    
    // Simulate sending notification (in real app, this would be queued)
    setTimeout(async () => {
      try {
        await simulateNotificationSending(notification);
        await notification.markAsSent('msg_' + Date.now());
      } catch (error) {
        await notification.markAsFailed(error.message);
      }
    }, 100);
  }
  
  logger.business('Notifications Sent', {
    count: notifications.length,
    type,
    priority,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 201, {
    notifications: notifications.map(n => ({
      id: n._id,
      recipient: n.recipient,
      type: n.type,
      status: n.status,
      createdAt: n.createdAt
    }))
  }, 'Notifications sent successfully');
});

// Simulate notification sending (replace with real service integration)
const simulateNotificationSending = async (notification) => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  
  // Simulate 95% success rate
  if (Math.random() < 0.05) {
    throw new Error('Simulated delivery failure');
  }
  
  logger.info(`${notification.type.toUpperCase()} notification sent`, {
    recipient: notification.recipient,
    template: notification.template
  });
};

// Get user's notifications
const getUserNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type, status } = req.query;
  
  const query = { recipient: req.user._id };
  
  if (type && type !== 'all') {
    query.type = type;
  }
  
  if (status && status !== 'all') {
    query.status = status;
  }
  
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Notification.countDocuments(query);
  
  sendSuccessResponse(res, 200, {
    notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Notifications retrieved successfully');
});

// Get notification by ID
const getNotificationById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findById(id)
    .populate('recipient', 'username email profile.firstName profile.lastName');
  
  if (!notification) {
    return sendErrorResponse(res, 404, 'Notification not found');
  }
  
  // Check access permissions
  if (notification.recipient._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  sendSuccessResponse(res, 200, {
    notification
  }, 'Notification retrieved successfully');
});

// Mark notification as delivered (webhook endpoint)
const markAsDelivered = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findById(id);
  
  if (!notification) {
    return sendErrorResponse(res, 404, 'Notification not found');
  }
  
  await notification.markAsDelivered();
  
  sendSuccessResponse(res, 200, null, 'Notification marked as delivered');
});

// Get notification statistics
const getNotificationStats = catchAsync(async (req, res) => {
  const { timeframe = 'week' } = req.query;
  
  let startDate;
  const now = new Date();
  
  switch (timeframe) {
    case 'day':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    default:
      startDate = new Date(now.setDate(now.getDate() - 7));
  }
  
  const query = req.user.role === 'admin' ? {} : { recipient: req.user._id };
  if (startDate) {
    query.createdAt = { $gte: startDate };
  }
  
  const stats = await Notification.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
      }
    }
  ]);
  
  const typeStats = await Notification.aggregate([
    { $match: query },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  sendSuccessResponse(res, 200, {
    overview: stats[0] || { total: 0, sent: 0, delivered: 0, failed: 0 },
    typeBreakdown: typeStats
  }, 'Notification statistics retrieved successfully');
});

// Send bulk notifications
const sendBulkNotifications = catchAsync(async (req, res) => {
  const { userQuery = {}, type, template, subject, message, data = {}, priority = 'normal' } = req.body;
  
  // Find users based on query
  const users = await User.find(userQuery).select('_id email');
  
  if (users.length === 0) {
    return sendErrorResponse(res, 400, 'No users found matching the criteria');
  }
  
  const notifications = [];
  
  // Create notifications for all users
  for (const user of users) {
    const notificationData = {
      recipient: user._id,
      type,
      template: template || 'bulk',
      message,
      data,
      priority
    };
    
    if (type === 'email' && subject) {
      notificationData.subject = subject;
    }
    
    const notification = await Notification.create(notificationData);
    notifications.push(notification);
  }
  
  // Process notifications in background (simplified)
  setTimeout(async () => {
    for (const notification of notifications) {
      try {
        await simulateNotificationSending(notification);
        await notification.markAsSent('bulk_' + Date.now());
      } catch (error) {
        await notification.markAsFailed(error.message);
      }
    }
  }, 100);
  
  logger.business('Bulk Notifications Sent', {
    count: notifications.length,
    type,
    priority,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 201, {
    count: notifications.length,
    recipients: users.length
  }, 'Bulk notifications queued successfully');
});

module.exports = {
  sendNotification,
  getUserNotifications,
  getNotificationById,
  markAsDelivered,
  getNotificationStats,
  sendBulkNotifications
}; 