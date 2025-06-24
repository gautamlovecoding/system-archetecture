const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { sendSuccessResponse, sendErrorResponse, catchAsync } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Create new complaint
const createComplaint = catchAsync(async (req, res) => {
  const { category, priority, title, description, tags = [] } = req.body;
  
  if (!category || !title || !description) {
    return sendErrorResponse(res, 400, 'Category, title, and description are required');
  }
  
  const complaint = await Complaint.create({
    userId: req.user._id,
    category,
    priority: priority || 'medium',
    title,
    description,
    tags
  });
  
  logger.business('Complaint Created', {
    complaintId: complaint._id,
    ticketId: complaint.ticketId,
    userId: req.user._id,
    category,
    priority
  });
  
  sendSuccessResponse(res, 201, {
    complaint: {
      id: complaint._id,
      ticketId: complaint.ticketId,
      category: complaint.category,
      priority: complaint.priority,
      status: complaint.status,
      title: complaint.title,
      description: complaint.description,
      tags: complaint.tags,
      createdAt: complaint.createdAt
    }
  }, 'Complaint created successfully');
});

// Get user's complaints
const getUserComplaints = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status = 'all', category } = req.query;
  
  const complaints = await Complaint.getUserComplaints(req.user._id, status);
  
  let filteredComplaints = complaints;
  if (category && category !== 'all') {
    filteredComplaints = complaints.filter(c => c.category === category);
  }
  
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedComplaints = filteredComplaints.slice(startIndex, endIndex);
  
  sendSuccessResponse(res, 200, {
    complaints: paginatedComplaints,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredComplaints.length,
      pages: Math.ceil(filteredComplaints.length / limit)
    }
  }, 'Complaints retrieved successfully');
});

// Get complaint by ID
const getComplaintById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const complaint = await Complaint.findById(id)
    .populate('userId', 'username email profile.firstName profile.lastName')
    .populate('assignedTo', 'username profile.firstName profile.lastName')
    .populate('messages.author', 'username profile.firstName profile.lastName')
    .populate('messages.attachments');
  
  if (!complaint) {
    return sendErrorResponse(res, 404, 'Complaint not found');
  }
  
  // Check access permissions
  if (complaint.userId._id.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  sendSuccessResponse(res, 200, {
    complaint
  }, 'Complaint retrieved successfully');
});

// Add message to complaint
const addMessage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { message, attachments = [] } = req.body;
  
  if (!message) {
    return sendErrorResponse(res, 400, 'Message is required');
  }
  
  const complaint = await Complaint.findById(id);
  
  if (!complaint) {
    return sendErrorResponse(res, 404, 'Complaint not found');
  }
  
  // Check access permissions
  if (complaint.userId.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  await complaint.addMessage(req.user._id, message, attachments);
  
  logger.business('Complaint Message Added', {
    complaintId: complaint._id,
    ticketId: complaint.ticketId,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 201, {
    complaint
  }, 'Message added successfully');
});

// Update complaint status
const updateComplaintStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, assignedTo } = req.body;
  
  const complaint = await Complaint.findById(id);
  
  if (!complaint) {
    return sendErrorResponse(res, 404, 'Complaint not found');
  }
  
  // Only admin/moderator can update status
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  if (status) {
    complaint.status = status;
    
    if (status === 'resolved') {
      await complaint.resolve();
    } else if (status === 'closed') {
      await complaint.close();
    }
  }
  
  if (assignedTo) {
    complaint.assignedTo = assignedTo;
  }
  
  await complaint.save();
  
  logger.business('Complaint Status Updated', {
    complaintId: complaint._id,
    ticketId: complaint.ticketId,
    newStatus: status,
    assignedTo,
    updatedBy: req.user._id
  });
  
  sendSuccessResponse(res, 200, {
    complaint
  }, 'Complaint updated successfully');
});

// Get all complaints (admin/moderator only)
const getAllComplaints = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    category, 
    priority, 
    assignedTo, 
    search 
  } = req.query;
  
  const query = {};
  
  if (status && status !== 'all') query.status = status;
  if (category && category !== 'all') query.category = category;
  if (priority && priority !== 'all') query.priority = priority;
  if (assignedTo && assignedTo !== 'all') query.assignedTo = assignedTo;
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { ticketId: { $regex: search, $options: 'i' } }
    ];
  }
  
  const complaints = await Complaint.find(query)
    .populate('userId', 'username email profile.firstName profile.lastName')
    .populate('assignedTo', 'username profile.firstName profile.lastName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Complaint.countDocuments(query);
  
  sendSuccessResponse(res, 200, {
    complaints,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Complaints retrieved successfully');
});

// Rate complaint resolution
const rateComplaint = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return sendErrorResponse(res, 400, 'Rating must be between 1 and 5');
  }
  
  const complaint = await Complaint.findById(id);
  
  if (!complaint) {
    return sendErrorResponse(res, 404, 'Complaint not found');
  }
  
  // Only complaint owner can rate
  if (complaint.userId.toString() !== req.user._id.toString()) {
    return sendErrorResponse(res, 403, 'Access denied');
  }
  
  // Can only rate resolved complaints
  if (complaint.status !== 'resolved' && complaint.status !== 'closed') {
    return sendErrorResponse(res, 400, 'Can only rate resolved complaints');
  }
  
  complaint.rating = rating;
  if (feedback) complaint.feedback = feedback;
  
  await complaint.save();
  
  logger.business('Complaint Rated', {
    complaintId: complaint._id,
    ticketId: complaint.ticketId,
    rating,
    userId: req.user._id
  });
  
  sendSuccessResponse(res, 200, {
    complaint
  }, 'Complaint rated successfully');
});

// Get complaint statistics
const getComplaintStats = catchAsync(async (req, res) => {
  const { timeframe = 'month' } = req.query;
  
  let startDate;
  const now = new Date();
  
  switch (timeframe) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setDate(now.getDate() - 30));
  }
  
  const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
  if (startDate) {
    query.createdAt = { $gte: startDate };
  }
  
  const stats = await Complaint.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        avgResolutionTime: { $avg: '$resolutionTime' },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  
  const categoryStats = await Complaint.aggregate([
    { $match: query },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  const priorityStats = await Complaint.aggregate([
    { $match: query },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  sendSuccessResponse(res, 200, {
    overview: stats[0] || {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      avgResolutionTime: 0,
      avgRating: 0
    },
    categoryBreakdown: categoryStats,
    priorityBreakdown: priorityStats
  }, 'Complaint statistics retrieved successfully');
});

module.exports = {
  createComplaint,
  getUserComplaints,
  getComplaintById,
  addMessage,
  updateComplaintStatus,
  getAllComplaints,
  rateComplaint,
  getComplaintStats
}; 