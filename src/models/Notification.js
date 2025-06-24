const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  type: {
    type: String,
    enum: ['email', 'sms', 'push'],
    required: true
  },
  
  template: {
    type: String,
    required: true
  },
  
  subject: {
    type: String,
    required: function() {
      return this.type === 'email';
    }
  },
  
  message: {
    type: String,
    required: true
  },
  
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  deliveryId: String,
  
  attempts: {
    type: Number,
    default: 0
  },
  
  lastAttempt: Date,
  sentAt: Date,
  deliveredAt: Date,
  
  error: String
  
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ priority: 1, createdAt: 1 });
notificationSchema.index({ createdAt: -1 });

// Instance method to mark as sent
notificationSchema.methods.markAsSent = async function(deliveryId) {
  this.status = 'sent';
  this.sentAt = new Date();
  this.deliveryId = deliveryId;
  return this.save();
};

// Instance method to mark as delivered
notificationSchema.methods.markAsDelivered = async function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Instance method to mark as failed
notificationSchema.methods.markAsFailed = async function(error) {
  this.status = 'failed';
  this.error = error;
  this.attempts += 1;
  this.lastAttempt = new Date();
  return this.save();
};

// Static method to get pending notifications
notificationSchema.statics.getPending = function(limit = 100) {
  return this.find({ status: 'pending' })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .populate('recipient', 'email profile.firstName profile.lastName');
};

module.exports = mongoose.model('Notification', notificationSchema); 