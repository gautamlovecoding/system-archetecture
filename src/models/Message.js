const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editedAt: Date,
  
  readAt: Date,
  
  metadata: {
    ip: String,
    userAgent: String
  }
  
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, status: 1 });
messageSchema.index({ createdAt: -1 });

// Static method to get chat history
messageSchema.statics.getChatHistory = async function(user1, user2, page = 1, limit = 50) {
  return this.find({
    $or: [
      { sender: user1, recipient: user2 },
      { sender: user2, recipient: user1 }
    ]
  })
  .populate('sender', 'username profile.firstName profile.lastName profile.avatar')
  .populate('recipient', 'username profile.firstName profile.lastName profile.avatar')
  .populate('attachments', 'filename originalName url mimetype')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit);
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    status: { $ne: 'read' }
  });
};

// Instance method to mark as read
messageSchema.methods.markAsRead = async function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance method to edit message
messageSchema.methods.editMessage = async function(newMessage) {
  this.message = newMessage;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema); 