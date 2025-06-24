const { logger } = require('../utils/logger');

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle MongoDB casting errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle MongoDB duplicate key errors
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// Handle MongoDB validation errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = () => 
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => 
  new AppError('Your token has expired! Please log in again.', 401);

// Send error for development environment
const sendErrorDev = (err, req, res) => {
  // Log the error
  logger.error('Development Error', err, {
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers
  });

  // Send detailed error response
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    request: {
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    }
  });
};

// Send error for production environment
const sendErrorProd = (err, req, res) => {
  // Log the error with context
  logger.error('Production Error', err, {
    url: req.originalUrl,
    method: req.method,
    statusCode: err.statusCode,
    isOperational: err.isOperational
  });

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unknown Error', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      statusCode: 500
    });
  }
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific MongoDB errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// Async error handler wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled routes
const handleUnhandledRoutes = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

// Validation error formatter
const formatValidationErrors = (errors) => {
  return errors.array().map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }));
};

// API response helpers
const sendSuccessResponse = (res, statusCode = 200, data = null, message = 'Success') => {
  const response = {
    success: true,
    message,
    statusCode
  };

  if (data !== null) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

const sendErrorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const response = {
    success: false,
    message,
    statusCode
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

// Common error messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to access this resource',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  DUPLICATE_RESOURCE: 'Resource already exists',
  INTERNAL_ERROR: 'Internal server error',
  BAD_REQUEST: 'Bad request',
  TOKEN_INVALID: 'Invalid or expired token',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
};

// Error factory functions
const createError = {
  badRequest: (message = ERROR_MESSAGES.BAD_REQUEST) => new AppError(message, 400),
  unauthorized: (message = ERROR_MESSAGES.UNAUTHORIZED) => new AppError(message, 401),
  forbidden: (message = ERROR_MESSAGES.FORBIDDEN) => new AppError(message, 403),
  notFound: (message = ERROR_MESSAGES.NOT_FOUND) => new AppError(message, 404),
  conflict: (message = ERROR_MESSAGES.DUPLICATE_RESOURCE) => new AppError(message, 409),
  validationError: (message = ERROR_MESSAGES.VALIDATION_ERROR) => new AppError(message, 422),
  internalError: (message = ERROR_MESSAGES.INTERNAL_ERROR) => new AppError(message, 500)
};

// Database error handler
const handleDatabaseError = (error) => {
  logger.error('Database Error', error);
  
  if (error.code === 11000) {
    return createError.conflict('Duplicate entry found');
  }
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return createError.validationError(`Validation Error: ${messages.join(', ')}`);
  }
  
  if (error.name === 'CastError') {
    return createError.badRequest(`Invalid ${error.path}: ${error.value}`);
  }
  
  return createError.internalError('Database operation failed');
};

// File upload error handler
const handleFileUploadError = (error) => {
  logger.error('File Upload Error', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return createError.badRequest('File size too large');
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return createError.badRequest('Too many files');
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return createError.badRequest('Unexpected file field');
  }
  
  return createError.badRequest('File upload failed');
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  handleUnhandledRoutes,
  formatValidationErrors,
  sendSuccessResponse,
  sendErrorResponse,
  ERROR_MESSAGES,
  createError,
  handleDatabaseError,
  handleFileUploadError
}; 