const Message = require('../models/Message');
const User = require('../models/User');
const { sendSuccessResponse, sendErrorResponse, catchAsync } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Send message
const sendMessage = catchAsync(async (req, res) => {
  const { recipientId, message, type = 'text', attachments = [] } = req.body;
  
  if (!recipientId || !message) {
    return sendErrorResponse(res, 400, 'Recipient ID and message are required');
  }
  
  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return sendErrorResponse(res, 404, 'Recipient not found');
  }
  
  // Create message
  const newMessage = await Message.create({
    sender: req.user._id,
    recipient: recipientId,
    message,
    type,
    attachments,
    metadata: {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  // Populate sender info
  const populatedMessage = await Message.findById(newMessage._id)
    .populate('sender', 'username profile.firstName profile.lastName profile.avatar')
    .populate('recipient', 'username profile.firstName profile.lastName profile.avatar')
    .populate('attachments', 'filename originalName url mimetype');
  
  // Emit to recipient via WebSocket (if connected)
  const io = req.app.get('io');
  if (io) {
    io.of('/chat').to(recipientId.toString()).emit('new-message', {
      id: populatedMessage._id,
      sender: populatedMessage.sender,
      message: populatedMessage.message,
      type: populatedMessage.type,
      attachments: populatedMessage.attachments,
      timestamp: populatedMessage.createdAt
    });
  }
  
  logger.business('Message Sent', {
    messageId: newMessage._id,
    senderId: req.user._id,
    recipientId
  });
  
  sendSuccessResponse(res, 201, {
    message: populatedMessage
  }, 'Message sent successfully');
});

// Get chat history between two users
const getChatHistory = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  if (!userId) {
    return sendErrorResponse(res, 400, 'User ID is required');
  }
  
  const messages = await Message.getChatHistory(
    req.user._id, 
    userId, 
    parseInt(page), 
    parseInt(limit)
  );
  
  const total = await Message.countDocuments({
    $or: [
      { sender: req.user._id, recipient: userId },
      { sender: userId, recipient: req.user._id }
    ]
  });
  
  sendSuccessResponse(res, 200, {
    messages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Chat history retrieved successfully');
});

// Get user's conversations
const getConversations = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  // Get latest message for each conversation
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { sender: req.user._id },
          { recipient: req.user._id }
        ]
      }
    },
    {
      $addFields: {
        otherUser: {
          $cond: [
            { $eq: ['$sender', req.user._id] },
            '$recipient',
            '$sender'
          ]
        }
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$otherUser',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$recipient', req.user._id] },
                  { $ne: ['$status', 'read'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    },
    {
      $skip: (page - 1) * limit
    },
    {
      $limit: limit
    }
  ]);
  
  sendSuccessResponse(res, 200, {
    conversations,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit)
    }
  }, 'Conversations retrieved successfully');
});

// Mark message as read
const markAsRead = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  
  const message = await Message.findById(messageId);
  
  if (!message) {
    return sendErrorResponse(res, 404, 'Message not found');
  }
  
  // Only recipient can mark message as read
  if (message.recipient.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  await message.markAsRead();
  
  // Emit read receipt to sender
  const io = req.app.get('io');
  if (io) {
    io.of('/chat').to(message.sender.toString()).emit('message-read', {
      messageId: message._id,
      readAt: message.readAt
    });
  }
  
  sendSuccessResponse(res, 200, null, 'Message marked as read');
});

// Mark all messages as read in conversation
const markConversationAsRead = catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  const result = await Message.updateMany(
    {
      sender: userId,
      recipient: req.user._id,
      status: { $ne: 'read' }
    },
    {
      status: 'read',
      readAt: new Date()
    }
  );
  
  logger.business('Conversation Marked as Read', {
    userId: req.user._id,
    otherUserId: userId,
    messagesMarked: result.modifiedCount
  });
  
  sendSuccessResponse(res, 200, {
    markedCount: result.modifiedCount
  }, 'Conversation marked as read');
});

// Edit message
const editMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const { message } = req.body;
  
  if (!message) {
    return sendErrorResponse(res, 400, 'Message content is required');
  }
  
  const existingMessage = await Message.findById(messageId);
  
  if (!existingMessage) {
    return sendErrorResponse(res, 404, 'Message not found');
  }
  
  // Only sender can edit message
  if (existingMessage.sender.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  // Can only edit within 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (existingMessage.createdAt < fifteenMinutesAgo) {
    return sendErrorResponse(res, 400, 'Message can only be edited within 15 minutes');
  }
  
  await existingMessage.editMessage(message);
  
  // Emit edit notification
  const io = req.app.get('io');
  if (io) {
    io.of('/chat').to(existingMessage.recipient.toString()).emit('message-edited', {
      messageId: existingMessage._id,
      newMessage: message,
      editedAt: existingMessage.editedAt
    });
  }
  
  sendSuccessResponse(res, 200, {
    message: existingMessage
  }, 'Message edited successfully');
});

// Delete message
const deleteMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  
  const message = await Message.findById(messageId);
  
  if (!message) {
    return sendErrorResponse(res, 404, 'Message not found');
  }
  
  // Only sender can delete message
  if (message.sender.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  await Message.findByIdAndDelete(messageId);
  
  // Emit delete notification
  const io = req.app.get('io');
  if (io) {
    io.of('/chat').to(message.recipient.toString()).emit('message-deleted', {
      messageId: message._id
    });
  }
  
  logger.business('Message Deleted', {
    messageId,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 200, null, 'Message deleted successfully');
});

// Get unread message count
const getUnreadCount = catchAsync(async (req, res) => {
  const count = await Message.getUnreadCount(req.user._id);
  
  sendSuccessResponse(res, 200, {
    unreadCount: count
  }, 'Unread count retrieved successfully');
});

// Search messages
const searchMessages = catchAsync(async (req, res) => {
  const { q, userId, page = 1, limit = 20 } = req.query;
  
  if (!q) {
    return sendErrorResponse(res, 400, 'Search query is required');
  }
  
  const query = {
    $or: [
      { sender: req.user._id },
      { recipient: req.user._id }
    ],
    message: { $regex: q, $options: 'i' }
  };
  
  if (userId) {
    query.$or = [
      { sender: req.user._id, recipient: userId },
      { sender: userId, recipient: req.user._id }
    ];
  }
  
  const messages = await Message.find(query)
    .populate('sender', 'username profile.firstName profile.lastName')
    .populate('recipient', 'username profile.firstName profile.lastName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Message.countDocuments(query);
  
  sendSuccessResponse(res, 200, {
    messages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Messages found successfully');
});

module.exports = {
  sendMessage,
  getChatHistory,
  getConversations,
  markAsRead,
  markConversationAsRead,
  editMessage,
  deleteMessage,
  getUnreadCount,
  searchMessages
}; 