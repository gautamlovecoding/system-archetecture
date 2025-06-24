const mongoose = require('mongoose');

const bulkOperationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  operation: {
    type: String,
    enum: ['import_users', 'import_urls', 'export_data', 'bulk_delete', 'bulk_update'],
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  fileName: {
    type: String,
    required: true
  },
  
  filePath: String,
  
  totalRecords: {
    type: Number,
    default: 0
  },
  
  processedRecords: {
    type: Number,
    default: 0
  },
  
  successfulRecords: {
    type: Number,
    default: 0
  },
  
  failedRecords: {
    type: Number,
    default: 0
  },
  
  errorList: [{
    row: Number,
    field: String,
    value: String,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  results: [{
    row: Number,
    success: Boolean,
    data: mongoose.Schema.Types.Mixed,
    error: String
  }],
  
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  startedAt: Date,
  completedAt: Date,
  
  metadata: {
    fileSize: Number,
    fileType: String,
    originalName: String
  }
  
}, {
  timestamps: true
});

// Indexes
bulkOperationSchema.index({ userId: 1, status: 1 });
bulkOperationSchema.index({ operation: 1, status: 1 });
bulkOperationSchema.index({ createdAt: -1 });

// Virtual for success rate
bulkOperationSchema.virtual('successRate').get(function() {
  if (this.processedRecords === 0) return 0;
  return ((this.successfulRecords / this.processedRecords) * 100).toFixed(2);
});

// Instance method to start processing
bulkOperationSchema.methods.startProcessing = async function() {
  this.status = 'processing';
  this.startedAt = new Date();
  return this.save();
};

// Instance method to update progress
bulkOperationSchema.methods.updateProgress = async function(processed, successful, failed, errors = []) {
  this.processedRecords = processed;
  this.successfulRecords = successful;
  this.failedRecords = failed;
  this.progress = Math.round((processed / this.totalRecords) * 100);
  
  if (errors.length > 0) {
    this.errorList.push(...errors);
  }
  
  return this.save();
};

// Instance method to complete processing
bulkOperationSchema.methods.complete = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress = 100;
  return this.save();
};

// Instance method to mark as failed
bulkOperationSchema.methods.markAsFailed = async function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorList.push({
    row: 0,
    error: error
  });
  return this.save();
};

module.exports = mongoose.model('BulkOperation', bulkOperationSchema); 