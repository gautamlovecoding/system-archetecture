const mongoose = require('mongoose');
const shortid = require('shortid');

const urlSchema = new mongoose.Schema({
  // Original long URL
  originalUrl: {
    type: String,
    required: [true, 'Original URL is required'],
    trim: true,
    validate: {
      validator: function(url) {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return urlPattern.test(url);
      },
      message: 'Please provide a valid URL'
    }
  },
  
  // Shortened URL code
  shortCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: [4, 'Short code must be at least 4 characters'],
    maxlength: [20, 'Short code cannot exceed 20 characters']
  },
  
  // Full shortened URL
  shortUrl: {
    type: String,
    required: true,
    unique: true
  },
  
  // URL creator (optional for anonymous URLs)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // URL metadata
  metadata: {
    title: {
      type: String,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    favicon: {
      type: String
    },
    image: {
      type: String
    },
    domain: {
      type: String,
      required: true
    }
  },
  
  // Custom settings
  customAlias: {
    type: String,
    sparse: true, // Allow multiple null values but unique non-null values
    trim: true,
    minlength: [3, 'Custom alias must be at least 3 characters'],
    maxlength: [50, 'Custom alias cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Custom alias can only contain letters, numbers, hyphens, and underscores']
  },
  
  // Password protection
  password: {
    type: String,
    select: false
  },
  
  // Expiration settings
  expiresAt: {
    type: Date,
    default: null
  },
  
  isExpired: {
    type: Boolean,
    default: false
  },
  
  // Status and settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Analytics and tracking
  analytics: {
    totalClicks: {
      type: Number,
      default: 0
    },
    uniqueClicks: {
      type: Number,
      default: 0
    },
    lastClickedAt: {
      type: Date,
      default: null
    },
    clicksToday: {
      type: Number,
      default: 0
    },
    clicksThisWeek: {
      type: Number,
      default: 0
    },
    clicksThisMonth: {
      type: Number,
      default: 0
    }
  },
  
  // Geographic analytics
  geoStats: [{
    country: String,
    countryCode: String,
    city: String,
    region: String,
    clicks: {
      type: Number,
      default: 1
    }
  }],
  
  // Browser and device analytics
  deviceStats: [{
    browser: String,
    os: String,
    device: String,
    clicks: {
      type: Number,
      default: 1
    }
  }],
  
  // Referrer analytics
  referrerStats: [{
    referrer: String,
    domain: String,
    clicks: {
      type: Number,
      default: 1
    }
  }],
  
  // Daily click history for graphs
  dailyClicks: [{
    date: {
      type: Date,
      required: true
    },
    clicks: {
      type: Number,
      default: 0
    }
  }],
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  
  // Category
  category: {
    type: String,
    enum: ['business', 'social', 'marketing', 'personal', 'education', 'entertainment', 'news', 'other'],
    default: 'other'
  },
  
  // UTM parameters for tracking
  utmParameters: {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String
  },
  
  // QR Code settings
  qrCode: {
    enabled: {
      type: Boolean,
      default: false
    },
    imageUrl: String,
    downloads: {
      type: Number,
      default: 0
    }
  },
  
  // Security features
  malwareCheck: {
    isChecked: {
      type: Boolean,
      default: false
    },
    isSafe: {
      type: Boolean,
      default: true
    },
    lastChecked: Date,
    scanResults: {
      provider: String,
      result: String,
      details: String
    }
  },
  
  // Bulk operation reference
  bulkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BulkOperation',
    default: null
  },
  
  // Notes from creator
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
// Note: shortCode and shortUrl indexes are automatically created by unique: true
urlSchema.index({ originalUrl: 1 });
urlSchema.index({ createdBy: 1 });
// Note: customAlias index is automatically created by unique: true (sparse)
urlSchema.index({ isActive: 1 });
urlSchema.index({ expiresAt: 1 });
urlSchema.index({ 'metadata.domain': 1 });
urlSchema.index({ category: 1 });
urlSchema.index({ tags: 1 });
urlSchema.index({ createdAt: -1 });
urlSchema.index({ 'analytics.totalClicks': -1 });

// Virtual for click-through rate (if applicable)
urlSchema.virtual('analytics.ctr').get(function() {
  if (this.analytics.totalClicks === 0) return 0;
  return ((this.analytics.uniqueClicks / this.analytics.totalClicks) * 100).toFixed(2);
});

// Virtual for average clicks per day
urlSchema.virtual('analytics.avgClicksPerDay').get(function() {
  const daysSinceCreation = Math.ceil((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  if (daysSinceCreation === 0) return 0;
  return (this.analytics.totalClicks / daysSinceCreation).toFixed(2);
});

// Pre-save middleware to generate short code
urlSchema.pre('save', function(next) {
  if (!this.shortCode) {
    // Generate unique short code
    const length = parseInt(process.env.SHORT_URL_LENGTH) || 6;
    this.shortCode = this.customAlias || shortid.generate().substring(0, length);
  }
  
  // Generate full short URL
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  this.shortUrl = `${baseUrl}/${this.shortCode}`;
  
  next();
});

// Pre-save middleware to extract domain from original URL
urlSchema.pre('save', function(next) {
  try {
    const url = new URL(this.originalUrl.startsWith('http') ? this.originalUrl : `http://${this.originalUrl}`);
    this.metadata.domain = url.hostname;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to check expiration
urlSchema.pre('save', function(next) {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
    this.isActive = false;
  }
  next();
});

// Instance method to increment click count
urlSchema.methods.incrementClick = async function(clickData = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Reset daily/weekly/monthly counters if needed
  const lastClick = this.analytics.lastClickedAt;
  if (!lastClick || lastClick < today) {
    this.analytics.clicksToday = 0;
  }
  if (!lastClick || lastClick < thisWeekStart) {
    this.analytics.clicksThisWeek = 0;
  }
  if (!lastClick || lastClick < thisMonthStart) {
    this.analytics.clicksThisMonth = 0;
  }
  
  // Increment counters
  this.analytics.totalClicks += 1;
  this.analytics.clicksToday += 1;
  this.analytics.clicksThisWeek += 1;
  this.analytics.clicksThisMonth += 1;
  this.analytics.lastClickedAt = new Date();
  
  // Update unique clicks (simplified - in production, track by IP/user)
  if (clickData.isUnique) {
    this.analytics.uniqueClicks += 1;
  }
  
  // Update geographic stats
  if (clickData.geo) {
    const geoStat = this.geoStats.find(stat => 
      stat.country === clickData.geo.country && stat.city === clickData.geo.city
    );
    
    if (geoStat) {
      geoStat.clicks += 1;
    } else {
      this.geoStats.push({
        country: clickData.geo.country,
        countryCode: clickData.geo.countryCode,
        city: clickData.geo.city,
        region: clickData.geo.region,
        clicks: 1
      });
    }
  }
  
  // Update device stats
  if (clickData.device) {
    const deviceStat = this.deviceStats.find(stat => 
      stat.browser === clickData.device.browser && stat.os === clickData.device.os
    );
    
    if (deviceStat) {
      deviceStat.clicks += 1;
    } else {
      this.deviceStats.push({
        browser: clickData.device.browser,
        os: clickData.device.os,
        device: clickData.device.device,
        clicks: 1
      });
    }
  }
  
  // Update referrer stats
  if (clickData.referrer) {
    const referrerStat = this.referrerStats.find(stat => 
      stat.referrer === clickData.referrer
    );
    
    if (referrerStat) {
      referrerStat.clicks += 1;
    } else {
      const referrerDomain = clickData.referrer.includes('/') 
        ? clickData.referrer.split('/')[2] 
        : clickData.referrer;
      
      this.referrerStats.push({
        referrer: clickData.referrer,
        domain: referrerDomain,
        clicks: 1
      });
    }
  }
  
  // Update daily clicks
  const todayStr = today.toISOString().split('T')[0];
  const dailyClick = this.dailyClicks.find(day => 
    day.date.toISOString().split('T')[0] === todayStr
  );
  
  if (dailyClick) {
    dailyClick.clicks += 1;
  } else {
    this.dailyClicks.push({
      date: today,
      clicks: 1
    });
  }
  
  // Keep only last 30 days of daily clicks
  if (this.dailyClicks.length > 30) {
    this.dailyClicks.sort((a, b) => b.date - a.date);
    this.dailyClicks = this.dailyClicks.slice(0, 30);
  }
  
  return this.save();
};

// Instance method to check if URL is accessible
urlSchema.methods.isAccessible = function(password = null) {
  // Check if URL is active
  if (!this.isActive) return false;
  
  // Check if URL is expired
  if (this.isExpired || (this.expiresAt && new Date() > this.expiresAt)) {
    return false;
  }
  
  // Check password if required
  if (this.password && this.password !== password) {
    return false;
  }
  
  return true;
};

// Instance method to get analytics summary
urlSchema.methods.getAnalyticsSummary = function() {
  return {
    totalClicks: this.analytics.totalClicks,
    uniqueClicks: this.analytics.uniqueClicks,
    clicksToday: this.analytics.clicksToday,
    clicksThisWeek: this.analytics.clicksThisWeek,
    clicksThisMonth: this.analytics.clicksThisMonth,
    lastClickedAt: this.analytics.lastClickedAt,
    ctr: this.analytics.ctr,
    avgClicksPerDay: this.analytics.avgClicksPerDay,
    topCountries: this.geoStats.sort((a, b) => b.clicks - a.clicks).slice(0, 5),
    topDevices: this.deviceStats.sort((a, b) => b.clicks - a.clicks).slice(0, 5),
    topReferrers: this.referrerStats.sort((a, b) => b.clicks - a.clicks).slice(0, 5)
  };
};

// Static method to find by short code or custom alias
urlSchema.statics.findByCode = function(code) {
  return this.findOne({
    $or: [
      { shortCode: code },
      { customAlias: code }
    ],
    isActive: true
  });
};

// Static method to get popular URLs
urlSchema.statics.getPopularUrls = function(limit = 10, timeframe = 'all') {
  const match = { isPublic: true, isActive: true };
  
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
    .sort({ 'analytics.totalClicks': -1 })
    .limit(limit)
    .populate('createdBy', 'username profile.firstName profile.lastName')
    .select('-password -malwareCheck');
};

// Static method to get user statistics
urlSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { createdBy: userId } },
    {
      $group: {
        _id: null,
        totalUrls: { $sum: 1 },
        totalClicks: { $sum: '$analytics.totalClicks' },
        activeUrls: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        expiredUrls: {
          $sum: {
            $cond: [{ $eq: ['$isExpired', true] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Static method to cleanup expired URLs
urlSchema.statics.cleanupExpired = async function() {
  const expiredUrls = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      isExpired: false
    },
    {
      isExpired: true,
      isActive: false
    }
  );
  
  return expiredUrls.modifiedCount;
};

module.exports = mongoose.model('Url', urlSchema); 