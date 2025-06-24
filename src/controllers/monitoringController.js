const { sendSuccessResponse, sendErrorResponse, catchAsync } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');
const redis = require('redis');
const os = require('os');
const fs = require('fs').promises;

// Health check endpoint
const healthCheck = catchAsync(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {}
  };
  
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      health.services.mongodb = {
        status: 'connected',
        responseTime: await checkMongoResponseTime()
      };
    } else {
      health.services.mongodb = { status: 'disconnected' };
      health.status = 'unhealthy';
    }
    
    // Check Redis connection
    try {
      const { cacheOperations } = require('../config/redis');
      await cacheOperations.set('health_check', 'ok', 5);
      health.services.redis = { status: 'connected' };
    } catch (error) {
      health.services.redis = { status: 'disconnected', error: error.message };
      health.status = 'degraded';
    }
    
    // System resources
    health.system = {
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      },
      cpu: {
        loadAverage: os.loadavg()[0],
        cores: os.cpus().length
      },
      disk: await getDiskUsage()
    };
    
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: health.status === 'healthy',
    data: health,
    message: `Service is ${health.status}`
  });
});

// Detailed system metrics
const getSystemMetrics = catchAsync(async (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    application: {
      name: 'System Design App',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
      cpus: os.cpus().length
    },
    process: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      versions: process.versions
    },
    database: await getDatabaseMetrics(),
    cache: await getCacheMetrics(),
    api: await getAPIMetrics()
  };
  
  sendSuccessResponse(res, 200, metrics, 'System metrics retrieved successfully');
});

// Get database metrics
const getDatabaseMetrics = async () => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    return {
      status: 'connected',
      collections: stats.collections,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      objects: stats.objects
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
};

// Get cache metrics
const getCacheMetrics = async () => {
  try {
    const { cacheOperations } = require('../config/redis');
    // Note: This is a simplified version - Redis client info would be more detailed
    return {
      status: 'connected',
      operations: {
        hits: 0, // Would track in real implementation
        misses: 0,
        sets: 0,
        gets: 0
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
};

// Get API metrics
const getAPIMetrics = async () => {
  // In a real implementation, you would track these metrics
  return {
    requests: {
      total: 0,
      successful: 0,
      failed: 0,
      averageResponseTime: 0
    },
    endpoints: {
      mostUsed: '/api/health',
      slowest: '/api/search',
      errors: []
    }
  };
};

// Check MongoDB response time
const checkMongoResponseTime = async () => {
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    return Date.now() - start;
  } catch (error) {
    return -1;
  }
};

// Get disk usage
const getDiskUsage = async () => {
  try {
    const stats = await fs.stat('.');
    return {
      available: 'N/A', // Would need platform-specific implementation
      used: 'N/A',
      total: 'N/A'
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
};

// Application logs endpoint
const getLogs = catchAsync(async (req, res) => {
  const { level = 'all', limit = 100, since } = req.query;
  
  try {
    // Read log files (simplified - in production you'd use a proper log aggregation system)
    const logFile = 'logs/app.log';
    const content = await fs.readFile(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    let logs = lines.slice(-limit).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { message: line, level: 'info', timestamp: new Date().toISOString() };
      }
    });
    
    // Filter by level
    if (level !== 'all') {
      logs = logs.filter(log => log.level === level);
    }
    
    // Filter by time
    if (since) {
      const sinceDate = new Date(since);
      logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
    }
    
    sendSuccessResponse(res, 200, {
      logs,
      total: logs.length,
      filters: { level, limit, since }
    }, 'Logs retrieved successfully');
    
  } catch (error) {
    sendErrorResponse(res, 500, 'Unable to read log files');
  }
});

// Performance metrics
const getPerformanceMetrics = catchAsync(async (req, res) => {
  const { timeframe = '1h' } = req.query;
  
  // In a real implementation, you would collect and store these metrics
  const metrics = {
    timeframe,
    timestamp: new Date().toISOString(),
    response_times: {
      avg: 150,
      p50: 120,
      p95: 300,
      p99: 500
    },
    throughput: {
      requests_per_second: 10,
      requests_per_minute: 600
    },
    errors: {
      rate: 0.02,
      count: 12,
      by_status: {
        '404': 8,
        '500': 3,
        '503': 1
      }
    },
    resource_usage: {
      cpu_percent: 25,
      memory_percent: 45,
      disk_percent: 60
    },
    database: {
      query_time_avg: 25,
      active_connections: 5,
      slow_queries: 2
    },
    cache: {
      hit_rate: 0.85,
      operations_per_second: 50
    }
  };
  
  sendSuccessResponse(res, 200, metrics, 'Performance metrics retrieved successfully');
});

// Server statistics
const getServerStats = catchAsync(async (req, res) => {
  const stats = {
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      loadavg: os.loadavg()
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
      speed: os.cpus()[0]?.speed || 0
    },
    network: os.networkInterfaces(),
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };
  
  sendSuccessResponse(res, 200, stats, 'Server statistics retrieved successfully');
});

// Clear application cache
const clearCache = catchAsync(async (req, res) => {
  try {
    const { cacheOperations } = require('../config/redis');
    
    // Clear specific cache patterns
    const patterns = ['url:*', 'user:*', 'search:*', 'session:*'];
    let clearedCount = 0;
    
    for (const pattern of patterns) {
      const count = await cacheOperations.deletePattern(pattern);
      clearedCount += count;
    }
    
    logger.business('Cache Cleared', {
      clearedKeys: clearedCount,
      userId: req.user._id
    });
    
    sendSuccessResponse(res, 200, {
      clearedKeys: clearedCount
    }, 'Cache cleared successfully');
    
  } catch (error) {
    logger.error('Cache clear failed:', error);
    sendErrorResponse(res, 500, 'Failed to clear cache');
  }
});

// Application configuration
const getConfig = catchAsync(async (req, res) => {
  const config = {
    environment: process.env.NODE_ENV || 'development',
    database: {
      host: process.env.MONGODB_URI ? 'configured' : 'not configured',
      name: 'system_design_app'
    },
    redis: {
      host: process.env.REDIS_URL ? 'configured' : 'not configured'
    },
    features: {
      rateLimiting: true,
      caching: true,
      logging: true,
      monitoring: true,
      fileUpload: true,
      notifications: true,
      chat: true,
      search: true,
      bulk: true
    },
    limits: {
      fileUploadSize: '50MB',
      bulkUploadSize: '10MB',
      rateLimitRequests: 100,
      rateLimitWindow: '15 minutes'
    }
  };
  
  sendSuccessResponse(res, 200, config, 'Configuration retrieved successfully');
});

// System alerts (placeholder for monitoring alerts)
const getAlerts = catchAsync(async (req, res) => {
  // In a real implementation, you would have alert rules and notifications
  const alerts = [
    {
      id: 1,
      level: 'warning',
      message: 'High memory usage detected',
      threshold: '80%',
      current: '85%',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      resolved: false
    },
    {
      id: 2,
      level: 'info',
      message: 'Database backup completed',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      resolved: true
    }
  ];
  
  sendSuccessResponse(res, 200, {
    alerts,
    summary: {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length
    }
  }, 'Alerts retrieved successfully');
});

module.exports = {
  healthCheck,
  getSystemMetrics,
  getLogs,
  getPerformanceMetrics,
  getServerStats,
  clearCache,
  getConfig,
  getAlerts
}; 