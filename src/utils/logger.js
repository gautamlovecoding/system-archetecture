const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'system-design-app' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write all logs to app.log (for general application logs)
    new winston.transports.File({ 
      filename: path.join(logsDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 2,
      tailable: true
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 2,
      tailable: true
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Custom logging methods for different scenarios
const systemLogger = {
  // General application logs
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  
  // Warning logs
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  
  // Error logs
  error: (message, error = null, meta = {}) => {
    const logMeta = { ...meta };
    if (error && error.stack) {
      logMeta.stack = error.stack;
    }
    logger.error(message, logMeta);
  },
  
  // Debug logs (only in development)
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(message, meta);
    }
  },
  
  // HTTP request logs
  http: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length') || '0'
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  },
  
  // Database operation logs
  database: (operation, collection, query = {}, executionTime = null) => {
    const logData = {
      operation,
      collection,
      query: JSON.stringify(query),
      executionTime: executionTime ? `${executionTime}ms` : null
    };
    
    logger.info('Database Operation', logData);
  },
  
  // Cache operation logs
  cache: (operation, key, hit = null, ttl = null) => {
    const logData = {
      operation,
      key,
      hit: hit !== null ? (hit ? 'HIT' : 'MISS') : null,
      ttl: ttl ? `${ttl}s` : null
    };
    
    logger.debug('Cache Operation', logData);
  },
  
  // Authentication logs
  auth: (action, userId = null, success = true, meta = {}) => {
    const logData = {
      action,
      userId,
      success,
      ...meta
    };
    
    if (success) {
      logger.info('Auth Action', logData);
    } else {
      logger.warn('Auth Action Failed', logData);
    }
  },
  
  // Security logs
  security: (event, details = {}, severity = 'medium') => {
    const logData = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    if (severity === 'high' || severity === 'critical') {
      logger.error('Security Event', logData);
    } else {
      logger.warn('Security Event', logData);
    }
  },
  
  // Performance logs
  performance: (operation, duration, threshold = 1000) => {
    const logData = {
      operation,
      duration: `${duration}ms`,
      slow: duration > threshold
    };
    
    if (duration > threshold) {
      logger.warn('Slow Operation Detected', logData);
    } else {
      logger.debug('Performance Metric', logData);
    }
  },
  
  // Business logic logs
  business: (event, data = {}) => {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    logger.info('Business Event', logData);
  }
};

// Express middleware for HTTP logging
const httpLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    systemLogger.http(req, res, duration);
  });
  
  next();
};

// Error logging middleware
const errorLoggerMiddleware = (error, req, res, next) => {
  systemLogger.error('Unhandled Error', error, {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers
  });
  
  next(error);
};

// Log system startup information
const logSystemInfo = () => {
  logger.info('System Information', {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
};

// Graceful shutdown logging
const logShutdown = (signal) => {
  logger.info('Application Shutdown', {
    signal,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger: systemLogger,
  httpLoggerMiddleware,
  errorLoggerMiddleware,
  logSystemInfo,
  logShutdown
}; 