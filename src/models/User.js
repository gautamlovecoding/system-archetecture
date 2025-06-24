const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Basic user information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  // Profile information
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: String,
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    }
  },
  
  // User status and verification
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Role-based access control
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  
  // Subscription and tier information
  subscription: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  
  // Usage statistics for rate limiting
  usage: {
    apiCallsToday: {
      type: Number,
      default: 0
    },
    apiCallsThisMonth: {
      type: Number,
      default: 0
    },
    lastApiCall: {
      type: Date
    },
    filesUploadedToday: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0 // in bytes
    }
  },
  
  // Security features
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      select: false
    },
    backupCodes: [{
      type: String,
      select: false
    }]
  },
  
  // Password reset
  passwordResetToken: {
    type: String,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  passwordChangedAt: {
    type: Date,
    select: false
  },
  
  // Login tracking
  loginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: String
  }],
  
  lastLogin: Date,
  
  // Account status
  accountLocked: {
    type: Boolean,
    default: false
  },
  
  lockReason: {
    type: String
  },
  
  lockedAt: {
    type: Date
  },
  
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Social connections
  socialConnections: {
    github: {
      id: String,
      username: String
    },
    google: {
      id: String,
      email: String
    },
    linkedin: {
      id: String,
      username: String
    }
  },
  
  refreshToken: String
  
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.twoFactorAuth;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
// Note: email and username indexes are automatically created by unique: true
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
});

// Virtual for account age
userSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Pre-save middleware to set default permissions based on role
userSchema.pre('save', function(next) {
  if (!this.isModified('role')) return next();
  
  const rolePermissions = {
    user: ['read:own_profile', 'write:own_profile', 'delete:own_account', 'upload:files'],
    premium: ['read:own_profile', 'write:own_profile', 'delete:own_account', 'upload:files', 'bulk:operations'],
    moderator: ['read:own_profile', 'write:own_profile', 'read:all_users', 'upload:files'],
    admin: [
      'read:own_profile', 'write:own_profile', 'delete:own_account',
      'read:all_users', 'write:all_users', 'delete:all_users',
      'manage:system', 'upload:files', 'bulk:operations', 'admin:dashboard'
    ]
  };
  
  this.permissions = rolePermissions[this.role] || rolePermissions.user;
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    permissions: this.permissions,
    tier: this.subscription
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    id: this._id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
};

// Instance method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Instance method to create email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  
  this.emailVerificationToken = require('crypto')
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Instance method to check permissions
userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Instance method to check if user can perform action
userSchema.methods.canPerform = function(action, resource = null) {
  // Admin can do everything
  if (this.role === 'admin') return true;
  
  // Check specific permissions
  const actionPermissionMap = {
    'read': 'read:',
    'write': 'write:',
    'delete': 'delete:',
    'upload': 'upload:files',
    'bulk': 'bulk:operations'
  };
  
  const permission = actionPermissionMap[action];
  if (!permission) return false;
  
  if (resource) {
    return this.hasPermission(`${permission}${resource}`) || this.hasPermission(`${permission}all_${resource}`);
  }
  
  return this.hasPermission(permission);
};

// Instance method to update usage statistics
userSchema.methods.updateUsage = function(type, amount = 1) {
  const today = new Date().toDateString();
  const lastCallDate = this.usage.lastApiCall ? this.usage.lastApiCall.toDateString() : null;
  
  // Reset daily counters if it's a new day
  if (lastCallDate !== today) {
    this.usage.apiCallsToday = 0;
    this.usage.filesUploadedToday = 0;
  }
  
  switch (type) {
    case 'api_call':
      this.usage.apiCallsToday += amount;
      this.usage.apiCallsThisMonth += amount;
      this.usage.lastApiCall = new Date();
      break;
    case 'file_upload':
      this.usage.filesUploadedToday += amount;
      break;
    case 'storage':
      this.usage.storageUsed += amount;
      break;
  }
};

// Static method to find by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// Static method to get user statistics
userSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        verifiedUsers: {
          $sum: {
            $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0]
          }
        },
        premiumUsers: {
          $sum: {
            $cond: [{ $eq: ['$subscription', 'premium'] }, 1, 0]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    premiumUsers: 0
  };
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);