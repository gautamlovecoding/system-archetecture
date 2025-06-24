const mongoose = require('mongoose');
const crypto = require('crypto');

const complaintSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  category: {
    type: String,
    enum: ['technical', 'billing', 'account', 'feature', 'bug', 'general'],
    required: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  tags: [String],
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  messages: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    attachments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  resolution: String,
  resolutionTime: Number, // in minutes
  resolvedAt: Date,
  closedAt: Date,
  
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  feedback: String
  
}, {
  timestamps: true
});

// Pre-save middleware to generate ticket ID
complaintSchema.pre('save', function(next) {
  if (this.isNew) {
    this.ticketId = 'TKT-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  next();
});

// Indexes
complaintSchema.index({ userId: 1, status: 1 });
complaintSchema.index({ category: 1, status: 1 });
complaintSchema.index({ priority: 1, status: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ ticketId: 1 });
complaintSchema.index({ createdAt: -1 });

// Static method to get user complaints
complaintSchema.statics.getUserComplaints = function(userId, status = 'all') {
  const query = { userId };
  if (status !== 'all') {
    query.status = status;
  }
  
  return this.find(query)
    .populate('assignedTo', 'username profile.firstName profile.lastName')
    .sort({ createdAt: -1 });
};

// Instance method to add message
complaintSchema.methods.addMessage = async function(authorId, message, attachments = []) {
  this.messages.push({
    author: authorId,
    message,
    attachments
  });
  
  // Update status if message is from admin/moderator
  const User = mongoose.model('User');
  const author = await User.findById(authorId);
  if (author && (author.role === 'admin' || author.role === 'moderator') && this.status === 'open') {
    this.status = 'in-progress';
  }
  
  return this.save();
};

// Instance method to resolve complaint
complaintSchema.methods.resolve = async function(resolution = '') {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolvedAt = new Date();
  
  // Calculate resolution time
  this.resolutionTime = Math.round((this.resolvedAt - this.createdAt) / (1000 * 60));
  
  return this.save();
};

// Instance method to close complaint
complaintSchema.methods.close = async function() {
  this.status = 'closed';
  this.closedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Complaint', complaintSchema); 