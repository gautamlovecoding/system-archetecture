const mongoose = require('mongoose');
const path = require('path');

const fileSchema = new mongoose.Schema({
  // Basic file information
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    unique: true
  },
  
  mimetype: {
    type: String,
    required: [true, 'MIME type is required']
  },
  
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0']
  },
  
  // File paths and URLs
  path: {
    type: String,
    required: [true, 'File path is required']
  },
  
  url: {
    type: String,
    required: [true, 'File URL is required']
  },
  
  // File owner
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // File categorization
  category: {
    type: String,
    enum: ['image', 'document', 'video', 'audio', 'archive', 'other'],
    required: true
  },
  
  subcategory: {
    type: String
  },
  
  // File metadata
  metadata: {
    // Image metadata
    dimensions: {
      width: Number,
      height: Number
    },
    
    // Video metadata
    duration: Number,
    fps: Number,
    
    // Document metadata
    pages: Number,
    
    // Common metadata
    encoding: String,
    compression: String,
    colorSpace: String,
    quality: String
  },
  
  // File processing status
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'completed'
    },
    
    startedAt: Date,
    completedAt: Date,
    
    tasks: [{
      name: String,
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      error: String,
      result: mongoose.Schema.Types.Mixed
    }]
  },
  
  // File variants (thumbnails, compressed versions, etc.)
  variants: [{
    type: {
      type: String,
      enum: ['thumbnail', 'small', 'medium', 'large', 'compressed'],
      required: true
    },
    filename: String,
    path: String,
    url: String,
    size: Number,
    dimensions: {
      width: Number,
      height: Number
    }
  }],
  
  // Access control
  visibility: {
    type: String,
    enum: ['public', 'private', 'shared'],
    default: 'private'
  },
  
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  
  shareExpires: Date,
  
  // File permissions
  permissions: {
    canView: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    canEdit: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    canDelete: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Tags and organization
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  
  folder: {
    type: String,
    default: '/'
  },
  
  // File analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    lastDownloaded: Date,
    
    // View history (last 100 views)
    viewHistory: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      ip: String,
      userAgent: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Security scanning
  security: {
    scanned: {
      type: Boolean,
      default: false
    },
    scanDate: Date,
    scanResult: {
      type: String,
      enum: ['safe', 'suspicious', 'malicious'],
      default: 'safe'
    },
    threats: [{
      type: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      description: String
    }],
    quarantined: {
      type: Boolean,
      default: false
    }
  },
  
  // File status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date,
  
  // Backup information
  backup: {
    isBackedUp: {
      type: Boolean,
      default: false
    },
    backupDate: Date,
    backupLocation: String,
    backupProvider: String
  },
  
  // File description and notes
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ category: 1 });
fileSchema.index({ mimetype: 1 });
fileSchema.index({ visibility: 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ folder: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ 'analytics.views': -1 });
fileSchema.index({ shareToken: 1 }, { sparse: true });
fileSchema.index({ isActive: 1, isDeleted: 1 });

// Virtual for file extension
fileSchema.virtual('extension').get(function() {
  return path.extname(this.originalName).toLowerCase();
});

// Virtual for human readable file size
fileSchema.virtual('sizeFormatted').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual to check if file is an image
fileSchema.virtual('isImage').get(function() {
  return this.category === 'image' || this.mimetype.startsWith('image/');
});

// Virtual to check if file is a video
fileSchema.virtual('isVideo').get(function() {
  return this.category === 'video' || this.mimetype.startsWith('video/');
});

// Virtual to check if file is a document
fileSchema.virtual('isDocument').get(function() {
  const documentMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];
  return this.category === 'document' || documentMimes.includes(this.mimetype);
});

// Pre-save middleware to set category based on mimetype
fileSchema.pre('save', function(next) {
  if (!this.category) {
    if (this.mimetype.startsWith('image/')) {
      this.category = 'image';
    } else if (this.mimetype.startsWith('video/')) {
      this.category = 'video';
    } else if (this.mimetype.startsWith('audio/')) {
      this.category = 'audio';
    } else if (this.mimetype.includes('pdf') || this.mimetype.includes('document') || 
               this.mimetype.includes('text') || this.mimetype.includes('spreadsheet')) {
      this.category = 'document';
    } else if (this.mimetype.includes('zip') || this.mimetype.includes('rar') || 
               this.mimetype.includes('tar') || this.mimetype.includes('gz')) {
      this.category = 'archive';
    } else {
      this.category = 'other';
    }
  }
  next();
});

// Pre-save middleware to generate share token if needed
fileSchema.pre('save', function(next) {
  if (this.visibility === 'shared' && !this.shareToken) {
    this.shareToken = require('crypto').randomBytes(32).toString('hex');
  }
  next();
});

// Instance method to increment view count
fileSchema.methods.incrementView = async function(viewData = {}) {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  
  // Add to view history (keep only last 100)
  this.analytics.viewHistory.unshift({
    user: viewData.user || null,
    ip: viewData.ip || null,
    userAgent: viewData.userAgent || null,
    timestamp: new Date()
  });
  
  if (this.analytics.viewHistory.length > 100) {
    this.analytics.viewHistory = this.analytics.viewHistory.slice(0, 100);
  }
  
  return this.save();
};

// Instance method to increment download count
fileSchema.methods.incrementDownload = async function() {
  this.analytics.downloads += 1;
  this.analytics.lastDownloaded = new Date();
  return this.save();
};

// Instance method to check if user can access file
fileSchema.methods.canAccess = function(user) {
  // Public files can be accessed by anyone
  if (this.visibility === 'public') return true;
  
  // Owner can always access
  if (user && this.uploadedBy.toString() === user._id.toString()) return true;
  
  // Check view permissions
  if (user && this.permissions.canView.includes(user._id)) return true;
  
  // Private files can only be accessed by owner and permitted users
  return false;
};

// Instance method to check if user can edit file
fileSchema.methods.canEdit = function(user) {
  if (!user) return false;
  
  // Owner can always edit
  if (this.uploadedBy.toString() === user._id.toString()) return true;
  
  // Check edit permissions
  return this.permissions.canEdit.includes(user._id);
};

// Instance method to check if user can delete file
fileSchema.methods.canDelete = function(user) {
  if (!user) return false;
  
  // Owner can always delete
  if (this.uploadedBy.toString() === user._id.toString()) return true;
  
  // Check delete permissions
  return this.permissions.canDelete.includes(user._id);
};

// Instance method to soft delete file
fileSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Instance method to restore deleted file
fileSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Instance method to create share link
fileSchema.methods.createShareLink = function(expiresIn = 24 * 60 * 60 * 1000) {
  this.visibility = 'shared';
  this.shareToken = require('crypto').randomBytes(32).toString('hex');
  this.shareExpires = new Date(Date.now() + expiresIn);
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/api/files/shared/${this.shareToken}`;
};

// Instance method to get thumbnail URL
fileSchema.methods.getThumbnailUrl = function() {
  const thumbnail = this.variants.find(v => v.type === 'thumbnail');
  return thumbnail ? thumbnail.url : null;
};

// Static method to find by share token
fileSchema.statics.findByShareToken = function(token) {
  return this.findOne({
    shareToken: token,
    visibility: 'shared',
    shareExpires: { $gt: new Date() },
    isActive: true,
    isDeleted: false
  });
};

// Static method to get user's storage usage
fileSchema.statics.getUserStorageUsage = async function(userId) {
  const result = await this.aggregate([
    { 
      $match: { 
        uploadedBy: userId,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        totalViews: { $sum: '$analytics.views' },
        totalDownloads: { $sum: '$analytics.downloads' }
      }
    }
  ]);
  
  return result[0] || {
    totalFiles: 0,
    totalSize: 0,
    totalViews: 0,
    totalDownloads: 0
  };
};

// Static method to get popular files
fileSchema.statics.getPopularFiles = function(limit = 10, timeframe = 'all') {
  const match = { 
    visibility: 'public', 
    isActive: true, 
    isDeleted: false 
  };
  
  // Add timeframe filter
  if (timeframe !== 'all') {
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
    }
    
    if (startDate) {
      match.createdAt = { $gte: startDate };
    }
  }
  
  return this.find(match)
    .sort({ 'analytics.views': -1 })
    .limit(limit)
    .populate('uploadedBy', 'username profile.firstName profile.lastName');
};

// Static method to cleanup expired shares
fileSchema.statics.cleanupExpiredShares = async function() {
  const expiredShares = await this.updateMany(
    {
      visibility: 'shared',
      shareExpires: { $lt: new Date() }
    },
    {
      $unset: {
        shareToken: 1,
        shareExpires: 1
      },
      visibility: 'private'
    }
  );
  
  return expiredShares.modifiedCount;
};

module.exports = mongoose.model('File', fileSchema); 