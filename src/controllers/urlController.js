const Url = require('../models/Url');
const { sendSuccessResponse, sendErrorResponse, createError, catchAsync } = require('../middleware/errorHandler');
const { cacheOperations } = require('../config/redis');
const { logger } = require('../utils/logger');

// Create short URL
const createShortUrl = catchAsync(async (req, res) => {
  const { originalUrl, customAlias, password, expiresAt, category, tags } = req.body;
  
  if (!originalUrl) {
    return sendErrorResponse(res, 400, 'Original URL is required');
  }
  
  // Check if custom alias already exists
  if (customAlias) {
    const existingUrl = await Url.findOne({ 
      $or: [{ shortCode: customAlias }, { customAlias }] 
    });
    
    if (existingUrl) {
      return sendErrorResponse(res, 400, 'Custom alias already exists');
    }
  }
  
  // Create URL
  const urlData = {
    originalUrl,
    createdBy: req.user ? req.user._id : null,
    customAlias: customAlias || null,
    password: password || null,
    category: category || 'other',
    tags: tags || []
  };
  
  if (expiresAt) {
    urlData.expiresAt = new Date(expiresAt);
  }
  
  const url = await Url.create(urlData);
  
  // Cache the URL for quick access
  await cacheOperations.set(`url:${url.shortCode}`, {
    originalUrl: url.originalUrl,
    password: url.password,
    isActive: url.isActive,
    expiresAt: url.expiresAt
  }, 3600);
  
  logger.business('URL Created', { 
    urlId: url._id, 
    shortCode: url.shortCode, 
    userId: req.user?._id 
  });
  
  sendSuccessResponse(res, 201, {
    url: {
      id: url._id,
      originalUrl: url.originalUrl,
      shortUrl: url.shortUrl,
      shortCode: url.shortCode,
      customAlias: url.customAlias,
      category: url.category,
      tags: url.tags,
      expiresAt: url.expiresAt,
      createdAt: url.createdAt
    }
  }, 'Short URL created successfully');
});

// Redirect to original URL
const redirectToOriginal = catchAsync(async (req, res) => {
  const { code } = req.params;
  const { password } = req.query;
  
  // Try to get from cache first
  let urlData = await cacheOperations.get(`url:${code}`);
  
  if (!urlData) {
    // If not in cache, get from database
    const url = await Url.findByCode(code);
    
    if (!url) {
      return sendErrorResponse(res, 404, 'Short URL not found');
    }
    
    urlData = {
      originalUrl: url.originalUrl,
      password: url.password,
      isActive: url.isActive,
      expiresAt: url.expiresAt,
      _id: url._id
    };
    
    // Cache for future requests
    await cacheOperations.set(`url:${code}`, urlData, 3600);
  }
  
  // Check if URL is accessible
  if (!urlData.isActive) {
    return sendErrorResponse(res, 404, 'Short URL is not active');
  }
  
  if (urlData.expiresAt && new Date() > new Date(urlData.expiresAt)) {
    return sendErrorResponse(res, 404, 'Short URL has expired');
  }
  
  if (urlData.password && urlData.password !== password) {
    return sendErrorResponse(res, 401, 'Password required to access this URL');
  }
  
  // Update analytics (async, don't wait)
  if (urlData._id) {
    Url.findById(urlData._id).then(url => {
      if (url) {
        url.incrementClick({
          isUnique: true, // Simplified - in production, track by IP/user
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          referrer: req.get('Referrer')
        });
      }
    }).catch(err => logger.error('Analytics update failed:', err));
  }
  
  logger.business('URL Accessed', { 
    shortCode: code, 
    ip: req.ip 
  });
  
  // Redirect to original URL
  res.redirect(301, urlData.originalUrl);
});

// Get URL analytics
const getUrlAnalytics = catchAsync(async (req, res) => {
  const { code } = req.params;
  
  const url = await Url.findByCode(code);
  
  if (!url) {
    return sendErrorResponse(res, 404, 'Short URL not found');
  }
  
  // Check if user owns the URL or is admin
  if (req.user && (url.createdBy?.toString() === req.user._id.toString() || req.user.role === 'admin')) {
    const analytics = url.getAnalyticsSummary();
    
    sendSuccessResponse(res, 200, {
      url: {
        id: url._id,
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        createdAt: url.createdAt
      },
      analytics
    }, 'Analytics retrieved successfully');
  } else {
    return sendErrorResponse(res, 403, 'Access denied');
  }
});

// Get user's URLs
const getUserUrls = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, category, search } = req.query;
  
  const query = { createdBy: req.user._id };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  if (search) {
    query.$or = [
      { originalUrl: { $regex: search, $options: 'i' } },
      { shortCode: { $regex: search, $options: 'i' } },
      { customAlias: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  const urls = await Url.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-password');
  
  const total = await Url.countDocuments(query);
  
  sendSuccessResponse(res, 200, {
    urls,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'URLs retrieved successfully');
});

// Update URL
const updateUrl = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { category, tags, password, expiresAt, isActive } = req.body;
  
  const url = await Url.findById(id);
  
  if (!url) {
    return sendErrorResponse(res, 404, 'URL not found');
  }
  
  // Check ownership
  if (url.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  // Update allowed fields
  if (category) url.category = category;
  if (tags) url.tags = tags;
  if (password !== undefined) url.password = password;
  if (expiresAt !== undefined) url.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (isActive !== undefined) url.isActive = isActive;
  
  await url.save();
  
  // Update cache
  await cacheOperations.del(`url:${url.shortCode}`);
  
  logger.business('URL Updated', { urlId: url._id, userId: req.user._id });
  
  sendSuccessResponse(res, 200, {
    url
  }, 'URL updated successfully');
});

// Delete URL
const deleteUrl = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const url = await Url.findById(id);
  
  if (!url) {
    return sendErrorResponse(res, 404, 'URL not found');
  }
  
  // Check ownership
  if (url.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  // Soft delete by marking as inactive
  url.isActive = false;
  await url.save();
  
  // Remove from cache
  await cacheOperations.del(`url:${url.shortCode}`);
  
  logger.business('URL Deleted', { urlId: url._id, userId: req.user._id });
  
  sendSuccessResponse(res, 200, null, 'URL deleted successfully');
});

// Get popular URLs
const getPopularUrls = catchAsync(async (req, res) => {
  const { limit = 10, timeframe = 'all' } = req.query;
  
  const urls = await Url.getPopularUrls(parseInt(limit), timeframe);
  
  sendSuccessResponse(res, 200, {
    urls
  }, 'Popular URLs retrieved successfully');
});

// Get URL stats (admin only)
const getUrlStats = catchAsync(async (req, res) => {
  const stats = await Url.aggregate([
    {
      $group: {
        _id: null,
        totalUrls: { $sum: 1 },
        activeUrls: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        totalClicks: { $sum: '$analytics.totalClicks' },
        avgClicksPerUrl: { $avg: '$analytics.totalClicks' }
      }
    }
  ]);
  
  const categoryStats = await Url.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  sendSuccessResponse(res, 200, {
    overview: stats[0] || {
      totalUrls: 0,
      activeUrls: 0,
      totalClicks: 0,
      avgClicksPerUrl: 0
    },
    categoryStats
  }, 'URL statistics retrieved successfully');
});

module.exports = {
  createShortUrl,
  redirectToOriginal,
  getUrlAnalytics,
  getUserUrls,
  updateUrl,
  deleteUrl,
  getPopularUrls,
  getUrlStats
}; 