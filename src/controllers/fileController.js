const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const File = require('../models/File');
const { sendSuccessResponse, sendErrorResponse, catchAsync } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: function (req, file, cb) {
    // Allow all file types for demonstration
    cb(null, true);
  }
});

// Upload single file
const uploadFile = catchAsync(async (req, res) => {
  if (!req.file) {
    return sendErrorResponse(res, 400, 'No file uploaded');
  }
  
  const { visibility = 'private', tags = [], description = '' } = req.body;
  
  const fileData = {
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    url: `/uploads/${req.file.filename}`,
    uploadedBy: req.user._id,
    visibility,
    tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
    description
  };
  
  const file = await File.create(fileData);
  
  logger.business('File Uploaded', {
    fileId: file._id,
    filename: file.originalName,
    size: file.size,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 201, {
    file: {
      id: file._id,
      originalName: file.originalName,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      sizeFormatted: file.sizeFormatted,
      url: file.url,
      visibility: file.visibility,
      tags: file.tags,
      description: file.description,
      createdAt: file.createdAt
    }
  }, 'File uploaded successfully');
});

// Upload multiple files
const uploadMultipleFiles = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendErrorResponse(res, 400, 'No files uploaded');
  }
  
  const { visibility = 'private', tags = [], description = '' } = req.body;
  const uploadedFiles = [];
  
  for (const file of req.files) {
    const fileData = {
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/uploads/${file.filename}`,
      uploadedBy: req.user._id,
      visibility,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      description
    };
    
    const savedFile = await File.create(fileData);
    uploadedFiles.push(savedFile);
  }
  
  logger.business('Multiple Files Uploaded', {
    count: uploadedFiles.length,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 201, {
    files: uploadedFiles.map(file => ({
      id: file._id,
      originalName: file.originalName,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      sizeFormatted: file.sizeFormatted,
      url: file.url,
      visibility: file.visibility,
      tags: file.tags,
      description: file.description,
      createdAt: file.createdAt
    }))
  }, 'Files uploaded successfully');
});

// Get file by ID
const getFileById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const file = await File.findById(id)
    .populate('uploadedBy', 'username profile.firstName profile.lastName');
  
  if (!file || file.isDeleted) {
    return sendErrorResponse(res, 404, 'File not found');
  }
  
  // Check access permissions
  if (!file.canAccess(req.user)) {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  // Increment view count (async)
  file.incrementView({
    user: req.user?._id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }).catch(err => logger.error('View count update failed:', err));
  
  sendSuccessResponse(res, 200, {
    file
  }, 'File retrieved successfully');
});

// Download file
const downloadFile = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const file = await File.findById(id);
  
  if (!file || file.isDeleted) {
    return sendErrorResponse(res, 404, 'File not found');
  }
  
  // Check access permissions
  if (!file.canAccess(req.user)) {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  try {
    // Check if file exists on disk
    await fs.access(file.path);
    
    // Increment download count (async)
    file.incrementDownload().catch(err => logger.error('Download count update failed:', err));
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    // Send file
    res.sendFile(path.resolve(file.path));
    
  } catch (error) {
    logger.error('File download error:', error);
    sendErrorResponse(res, 404, 'File not found on disk');
  }
});

// Get user's files
const getUserFiles = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, category, search, visibility } = req.query;
  
  const query = { 
    uploadedBy: req.user._id, 
    isDeleted: false 
  };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  if (visibility && visibility !== 'all') {
    query.visibility = visibility;
  }
  
  if (search) {
    query.$or = [
      { originalName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  const files = await File.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-path'); // Don't expose file system path
  
  const total = await File.countDocuments(query);
  
  sendSuccessResponse(res, 200, {
    files,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Files retrieved successfully');
});

// Update file metadata
const updateFile = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { visibility, tags, description } = req.body;
  
  const file = await File.findById(id);
  
  if (!file || file.isDeleted) {
    return sendErrorResponse(res, 404, 'File not found');
  }
  
  // Check edit permissions
  if (!file.canEdit(req.user)) {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  // Update allowed fields
  if (visibility) file.visibility = visibility;
  if (tags) file.tags = tags;
  if (description !== undefined) file.description = description;
  
  await file.save();
  
  logger.business('File Updated', { fileId: file._id, userId: req.user._id });
  
  sendSuccessResponse(res, 200, {
    file
  }, 'File updated successfully');
});

// Delete file
const deleteFile = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const file = await File.findById(id);
  
  if (!file || file.isDeleted) {
    return sendErrorResponse(res, 404, 'File not found');
  }
  
  // Check delete permissions
  if (!file.canDelete(req.user)) {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  // Soft delete
  await file.softDelete();
  
  logger.business('File Deleted', { fileId: file._id, userId: req.user._id });
  
  sendSuccessResponse(res, 200, null, 'File deleted successfully');
});

// Create share link
const createShareLink = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { expiresIn = 24 * 60 * 60 * 1000 } = req.body; // Default 24 hours
  
  const file = await File.findById(id);
  
  if (!file || file.isDeleted) {
    return sendErrorResponse(res, 404, 'File not found');
  }
  
  // Check if user owns the file
  if (file.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  const shareLink = file.createShareLink(expiresIn);
  await file.save();
  
  sendSuccessResponse(res, 200, {
    shareLink,
    expiresAt: file.shareExpires
  }, 'Share link created successfully');
});

// Access shared file
const getSharedFile = catchAsync(async (req, res) => {
  const { token } = req.params;
  
  const file = await File.findByShareToken(token)
    .populate('uploadedBy', 'username profile.firstName profile.lastName');
  
  if (!file) {
    return sendErrorResponse(res, 404, 'Shared file not found or expired');
  }
  
  sendSuccessResponse(res, 200, {
    file: {
      id: file._id,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      sizeFormatted: file.sizeFormatted,
      url: file.url,
      description: file.description,
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt
    }
  }, 'Shared file retrieved successfully');
});

// Get file statistics
const getFileStats = catchAsync(async (req, res) => {
  const userId = req.user.role === 'admin' ? null : req.user._id;
  const storageUsage = await File.getUserStorageUsage(userId || req.user._id);
  
  const stats = await File.aggregate([
    ...(userId ? [{ $match: { uploadedBy: userId } }] : []),
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  sendSuccessResponse(res, 200, {
    storageUsage,
    categoryBreakdown: stats
  }, 'File statistics retrieved successfully');
});

module.exports = {
  upload,
  uploadFile,
  uploadMultipleFiles,
  getFileById,
  downloadFile,
  getUserFiles,
  updateFile,
  deleteFile,
  createShareLink,
  getSharedFile,
  getFileStats
}; 