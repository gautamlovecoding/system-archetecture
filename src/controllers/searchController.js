const Url = require('../models/Url');
const File = require('../models/File');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { sendSuccessResponse, sendErrorResponse, catchAsync } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Universal search across all entities
const universalSearch = catchAsync(async (req, res) => {
  const { q, page = 1, limit = 20, entities = 'all' } = req.query;
  
  if (!q) {
    return sendErrorResponse(res, 400, 'Search query is required');
  }
  
  const results = {};
  const searchRegex = { $regex: q, $options: 'i' };
  
  // Search URLs
  if (entities === 'all' || entities.includes('urls')) {
    const urlQuery = {
      $or: [
        { originalUrl: searchRegex },
        { shortCode: searchRegex },
        { customAlias: searchRegex },
        { tags: searchRegex }
      ],
      isActive: true
    };
    
    if (req.user) {
      urlQuery.$or.push({ createdBy: req.user._id });
    } else {
      urlQuery.isPublic = true;
    }
    
    results.urls = await Url.find(urlQuery)
      .populate('createdBy', 'username')
      .sort({ 'analytics.totalClicks': -1 })
      .limit(10)
      .select('-password');
  }
  
  // Search Files
  if (entities === 'all' || entities.includes('files')) {
    const fileQuery = {
      $or: [
        { originalName: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ],
      isDeleted: false
    };
    
    if (req.user) {
      fileQuery.$or.push(
        { uploadedBy: req.user._id },
        { visibility: 'public' }
      );
    } else {
      fileQuery.visibility = 'public';
    }
    
    results.files = await File.find(fileQuery)
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-path');
  }
  
  // Search Users (public profiles only)
  if (entities === 'all' || entities.includes('users')) {
    results.users = await User.find({
      $or: [
        { username: searchRegex },
        { 'profile.firstName': searchRegex },
        { 'profile.lastName': searchRegex }
      ],
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('username profile.firstName profile.lastName profile.avatar');
  }
  
  // Search Complaints (only for admins/moderators or own complaints)
  if ((entities === 'all' || entities.includes('complaints')) && req.user) {
    const complaintQuery = {
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { ticketId: searchRegex }
      ]
    };
    
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      complaintQuery.userId = req.user._id;
    }
    
    results.complaints = await Complaint.find(complaintQuery)
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .limit(10);
  }
  
  logger.business('Universal Search', {
    query: q,
    entities,
    resultsCount: Object.keys(results).reduce((sum, key) => sum + results[key].length, 0),
    userId: req.user?._id
  });
  
  sendSuccessResponse(res, 200, {
    query: q,
    results
  }, 'Search completed successfully');
});

// Search URLs with advanced filters
const searchUrls = catchAsync(async (req, res) => {
  const { 
    q, 
    category, 
    tags, 
    dateFrom, 
    dateTo, 
    minClicks,
    maxClicks,
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    page = 1, 
    limit = 20 
  } = req.query;
  
  const query = { isActive: true };
  
  // Text search
  if (q) {
    query.$or = [
      { originalUrl: { $regex: q, $options: 'i' } },
      { shortCode: { $regex: q, $options: 'i' } },
      { customAlias: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } }
    ];
  }
  
  // Category filter
  if (category && category !== 'all') {
    query.category = category;
  }
  
  // Tags filter
  if (tags) {
    const tagsArray = Array.isArray(tags) ? tags : [tags];
    query.tags = { $in: tagsArray };
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
  
  // Click range filter
  if (minClicks || maxClicks) {
    query['analytics.totalClicks'] = {};
    if (minClicks) query['analytics.totalClicks'].$gte = parseInt(minClicks);
    if (maxClicks) query['analytics.totalClicks'].$lte = parseInt(maxClicks);
  }
  
  // Visibility filter
  if (req.user) {
    query.$or = [
      { createdBy: req.user._id },
      { isPublic: true }
    ];
  } else {
    query.isPublic = true;
  }
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const urls = await Url.find(query)
    .populate('createdBy', 'username profile.firstName profile.lastName')
    .sort(sortConfig)
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
    },
    filters: {
      category,
      tags,
      dateFrom,
      dateTo,
      minClicks,
      maxClicks,
      sortBy,
      sortOrder
    }
  }, 'URL search completed successfully');
});

// Search files with advanced filters
const searchFiles = catchAsync(async (req, res) => {
  const { 
    q, 
    category, 
    mimetype,
    minSize,
    maxSize,
    visibility,
    tags, 
    dateFrom, 
    dateTo, 
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    page = 1, 
    limit = 20 
  } = req.query;
  
  const query = { isDeleted: false };
  
  // Text search
  if (q) {
    query.$or = [
      { originalName: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } }
    ];
  }
  
  // Category filter
  if (category && category !== 'all') {
    query.category = category;
  }
  
  // MIME type filter
  if (mimetype) {
    query.mimetype = { $regex: mimetype, $options: 'i' };
  }
  
  // File size filter
  if (minSize || maxSize) {
    query.size = {};
    if (minSize) query.size.$gte = parseInt(minSize);
    if (maxSize) query.size.$lte = parseInt(maxSize);
  }
  
  // Visibility filter
  if (visibility && visibility !== 'all') {
    query.visibility = visibility;
  }
  
  // Tags filter
  if (tags) {
    const tagsArray = Array.isArray(tags) ? tags : [tags];
    query.tags = { $in: tagsArray };
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
  
  // Access control
  if (req.user) {
    query.$or = [
      { uploadedBy: req.user._id },
      { visibility: 'public' }
    ];
  } else {
    query.visibility = 'public';
  }
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const files = await File.find(query)
    .populate('uploadedBy', 'username profile.firstName profile.lastName')
    .sort(sortConfig)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-path');
  
  const total = await File.countDocuments(query);
  
  sendSuccessResponse(res, 200, {
    files,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    filters: {
      category,
      mimetype,
      minSize,
      maxSize,
      visibility,
      tags,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder
    }
  }, 'File search completed successfully');
});

// Get search suggestions
const getSearchSuggestions = catchAsync(async (req, res) => {
  const { q, type = 'all' } = req.query;
  
  if (!q || q.length < 2) {
    return sendSuccessResponse(res, 200, { suggestions: [] }, 'No suggestions available');
  }
  
  const suggestions = [];
  const searchRegex = { $regex: `^${q}`, $options: 'i' };
  
  if (type === 'all' || type === 'urls') {
    const urlSuggestions = await Url.distinct('tags', {
      tags: searchRegex,
      isActive: true,
      isPublic: true
    });
    suggestions.push(...urlSuggestions.slice(0, 5));
  }
  
  if (type === 'all' || type === 'files') {
    const fileSuggestions = await File.distinct('tags', {
      tags: searchRegex,
      isDeleted: false,
      visibility: 'public'
    });
    suggestions.push(...fileSuggestions.slice(0, 5));
  }
  
  // Remove duplicates and limit
  const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);
  
  sendSuccessResponse(res, 200, {
    suggestions: uniqueSuggestions
  }, 'Search suggestions retrieved successfully');
});

// Get popular search terms
const getPopularSearchTerms = catchAsync(async (req, res) => {
  // In a real application, you would track search queries
  // For now, we'll return popular tags as search terms
  
  const urlTags = await Url.aggregate([
    { $match: { isActive: true, isPublic: true } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  const fileTags = await File.aggregate([
    { $match: { isDeleted: false, visibility: 'public' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  const popularTerms = [
    ...urlTags.map(t => ({ term: t._id, count: t.count, type: 'url' })),
    ...fileTags.map(t => ({ term: t._id, count: t.count, type: 'file' }))
  ].sort((a, b) => b.count - a.count).slice(0, 15);
  
  sendSuccessResponse(res, 200, {
    popularTerms
  }, 'Popular search terms retrieved successfully');
});

module.exports = {
  universalSearch,
  searchUrls,
  searchFiles,
  getSearchSuggestions,
  getPopularSearchTerms
}; 