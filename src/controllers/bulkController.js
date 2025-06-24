const BulkOperation = require('../models/BulkOperation');
const User = require('../models/User');
const Url = require('../models/Url');
const { sendSuccessResponse, sendErrorResponse, catchAsync } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configure multer for bulk file uploads
const upload = multer({
  dest: 'uploads/bulk/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Start bulk import operation
const startBulkImport = catchAsync(async (req, res) => {
  if (!req.file) {
    return sendErrorResponse(res, 400, 'CSV file is required');
  }
  
  const { operation } = req.body;
  
  if (!operation || !['import_users', 'import_urls'].includes(operation)) {
    return sendErrorResponse(res, 400, 'Valid operation type is required (import_users, import_urls)');
  }
  
  // Create bulk operation record
  const bulkOp = await BulkOperation.create({
    userId: req.user._id,
    operation,
    fileName: req.file.originalname,
    filePath: req.file.path,
    metadata: {
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      originalName: req.file.originalname
    }
  });
  
  // Start processing in background
  processBulkOperation(bulkOp);
  
  logger.business('Bulk Operation Started', {
    operationId: bulkOp._id,
    operation,
    fileName: req.file.originalname,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 201, {
    operation: {
      id: bulkOp._id,
      operation: bulkOp.operation,
      fileName: bulkOp.fileName,
      status: bulkOp.status,
      createdAt: bulkOp.createdAt
    }
  }, 'Bulk operation started successfully');
});

// Process bulk operation (background task)
const processBulkOperation = async (bulkOp) => {
  try {
    await bulkOp.startProcessing();
    
    const results = [];
    const errors = [];
    let rowCount = 0;
    let successCount = 0;
    let failureCount = 0;
    
    // Read CSV file
    const csvData = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(bulkOp.filePath)
        .pipe(csv())
        .on('data', (data) => csvData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    bulkOp.totalRecords = csvData.length;
    await bulkOp.save();
    
    // Process each row
    for (const row of csvData) {
      rowCount++;
      
      try {
        let result;
        
        if (bulkOp.operation === 'import_users') {
          result = await processUserImport(row, rowCount);
        } else if (bulkOp.operation === 'import_urls') {
          result = await processUrlImport(row, rowCount, bulkOp.userId);
        }
        
        if (result.success) {
          successCount++;
          results.push({
            row: rowCount,
            success: true,
            data: result.data
          });
        } else {
          failureCount++;
          errors.push({
            row: rowCount,
            field: result.field,
            value: result.value,
            error: result.error
          });
          results.push({
            row: rowCount,
            success: false,
            error: result.error
          });
        }
        
        // Update progress every 10 rows
        if (rowCount % 10 === 0) {
          await bulkOp.updateProgress(rowCount, successCount, failureCount, []);
        }
        
      } catch (error) {
        failureCount++;
        errors.push({
          row: rowCount,
          error: error.message
        });
      }
    }
    
    // Final update and completion
    bulkOp.results = results;
    bulkOp.errors = errors;
    await bulkOp.updateProgress(rowCount, successCount, failureCount, []);
    await bulkOp.complete();
    
    // Clean up uploaded file
    fs.unlinkSync(bulkOp.filePath);
    
    logger.business('Bulk Operation Completed', {
      operationId: bulkOp._id,
      totalRecords: rowCount,
      successCount,
      failureCount
    });
    
  } catch (error) {
    logger.error('Bulk operation failed:', error);
    await bulkOp.markAsFailed(error.message);
  }
};

// Process user import
const processUserImport = async (row, rowNumber) => {
  try {
    const { username, email, password, firstName, lastName } = row;
    
    if (!username || !email || !password) {
      return {
        success: false,
        field: 'required',
        error: 'Username, email, and password are required'
      };
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return {
        success: false,
        field: 'duplicate',
        error: 'User already exists with this email or username'
      };
    }
    
    // Create user
    const user = await User.create({
      username,
      email,
      password,
      profile: {
        firstName: firstName || '',
        lastName: lastName || ''
      }
    });
    
    return {
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Process URL import
const processUrlImport = async (row, rowNumber, userId) => {
  try {
    const { originalUrl, customAlias, category, tags } = row;
    
    if (!originalUrl) {
      return {
        success: false,
        field: 'originalUrl',
        error: 'Original URL is required'
      };
    }
    
    // Check if custom alias already exists
    if (customAlias) {
      const existingUrl = await Url.findOne({
        $or: [{ shortCode: customAlias }, { customAlias }]
      });
      
      if (existingUrl) {
        return {
          success: false,
          field: 'customAlias',
          error: 'Custom alias already exists'
        };
      }
    }
    
    // Create URL
    const url = await Url.create({
      originalUrl,
      customAlias: customAlias || null,
      category: category || 'other',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      createdBy: userId
    });
    
    return {
      success: true,
      data: {
        id: url._id,
        originalUrl: url.originalUrl,
        shortUrl: url.shortUrl,
        shortCode: url.shortCode
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Get bulk operation status
const getBulkOperationStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const operation = await BulkOperation.findById(id);
  
  if (!operation) {
    return sendErrorResponse(res, 404, 'Bulk operation not found');
  }
  
  // Check access permissions
  if (operation.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  sendSuccessResponse(res, 200, {
    operation: {
      id: operation._id,
      operation: operation.operation,
      fileName: operation.fileName,
      status: operation.status,
      progress: operation.progress,
      totalRecords: operation.totalRecords,
      processedRecords: operation.processedRecords,
      successfulRecords: operation.successfulRecords,
      failedRecords: operation.failedRecords,
      successRate: operation.successRate,
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
      createdAt: operation.createdAt
    }
  }, 'Bulk operation status retrieved successfully');
});

// Get user's bulk operations
const getUserBulkOperations = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, operation } = req.query;
  
  const query = { userId: req.user._id };
  
  if (status && status !== 'all') {
    query.status = status;
  }
  
  if (operation && operation !== 'all') {
    query.operation = operation;
  }
  
  const operations = await BulkOperation.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-filePath -results'); // Don't return sensitive data
  
  const total = await BulkOperation.countDocuments(query);
  
  sendSuccessResponse(res, 200, {
    operations,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Bulk operations retrieved successfully');
});

// Get bulk operation results
const getBulkOperationResults = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50, success } = req.query;
  
  const operation = await BulkOperation.findById(id);
  
  if (!operation) {
    return sendErrorResponse(res, 404, 'Bulk operation not found');
  }
  
  // Check access permissions
  if (operation.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  let results = operation.results || [];
  
  // Filter by success status if specified
  if (success !== undefined) {
    const isSuccess = success === 'true';
    results = results.filter(r => r.success === isSuccess);
  }
  
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedResults = results.slice(startIndex, endIndex);
  
  sendSuccessResponse(res, 200, {
    operation: {
      id: operation._id,
      operation: operation.operation,
      fileName: operation.fileName,
      status: operation.status
    },
    results: paginatedResults,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: results.length,
      pages: Math.ceil(results.length / limit)
    }
  }, 'Bulk operation results retrieved successfully');
});

// Get sample CSV template
const getCSVTemplate = catchAsync(async (req, res) => {
  const { operation } = req.params;
  
  let csvContent = '';
  let filename = '';
  
  switch (operation) {
    case 'import_users':
      csvContent = 'username,email,password,firstName,lastName\n';
      csvContent += 'john_doe,john@example.com,password123,John,Doe\n';
      csvContent += 'jane_smith,jane@example.com,securepass456,Jane,Smith';
      filename = 'users_import_template.csv';
      break;
      
    case 'import_urls':
      csvContent = 'originalUrl,customAlias,category,tags\n';
      csvContent += 'https://example.com,example,tech,"web,technology"\n';
      csvContent += 'https://google.com,,search,"search,engine"';
      filename = 'urls_import_template.csv';
      break;
      
    default:
      return sendErrorResponse(res, 400, 'Invalid operation type');
  }
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

// Cancel bulk operation
const cancelBulkOperation = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const operation = await BulkOperation.findById(id);
  
  if (!operation) {
    return sendErrorResponse(res, 404, 'Bulk operation not found');
  }
  
  // Check access permissions
  if (operation.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  if (operation.status === 'completed' || operation.status === 'failed') {
    return sendErrorResponse(res, 400, 'Cannot cancel completed or failed operation');
  }
  
  operation.status = 'cancelled';
  operation.completedAt = new Date();
  await operation.save();
  
  logger.business('Bulk Operation Cancelled', {
    operationId: operation._id,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 200, null, 'Bulk operation cancelled successfully');
});

module.exports = {
  upload,
  startBulkImport,
  getBulkOperationStatus,
  getUserBulkOperations,
  getBulkOperationResults,
  getCSVTemplate,
  cancelBulkOperation
}; 