const redis = require('redis');
const { logger } = require('../utils/logger');

let redisClient = null;

// Redis connection setup
const setupRedis = async () => {
  try {
    const redisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
        return delay;
      },
      connect_timeout: 60000,
      lazyConnect: true
    };

    redisClient = redis.createClient(redisConfig);

    // Handle Redis events
    redisClient.on('connect', () => {
      logger.info('🔴 Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('🔴 Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection ended');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('Redis connection established successfully');

    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error.message);
    logger.warn('Running without Redis cache - some features may be limited');
    return null;
  }
};

// Get Redis client instance
const getRedisClient = () => {
  return redisClient;
};

// Cache operations with error handling
const cacheOperations = {
  // Set cache with TTL
  set: async (key, value, ttl = 3600) => {
    try {
      if (!redisClient || !redisClient.isOpen) return false;
      
      const serializedValue = JSON.stringify(value);
      await redisClient.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error.message);
      return false;
    }
  },

  // Get from cache
  get: async (key) => {
    try {
      if (!redisClient || !redisClient.isOpen) return null;
      
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error.message);
      return null;
    }
  },

  // Delete from cache
  del: async (key) => {
    try {
      if (!redisClient || !redisClient.isOpen) return false;
      
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error.message);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      if (!redisClient || !redisClient.isOpen) return false;
      
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache EXISTS error for key ${key}:`, error.message);
      return false;
    }
  },

  // Set with expiration time
  expire: async (key, seconds) => {
    try {
      if (!redisClient || !redisClient.isOpen) return false;
      
      await redisClient.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error(`Cache EXPIRE error for key ${key}:`, error.message);
      return false;
    }
  },

  // Increment counter
  incr: async (key) => {
    try {
      if (!redisClient || !redisClient.isOpen) return 0;
      
      return await redisClient.incr(key);
    } catch (error) {
      logger.error(`Cache INCR error for key ${key}:`, error.message);
      return 0;
    }
  },

  // Get all keys matching pattern
  keys: async (pattern) => {
    try {
      if (!redisClient || !redisClient.isOpen) return [];
      
      return await redisClient.keys(pattern);
    } catch (error) {
      logger.error(`Cache KEYS error for pattern ${pattern}:`, error.message);
      return [];
    }
  },

  // Flush all cache
  flushAll: async () => {
    try {
      if (!redisClient || !redisClient.isOpen) return false;
      
      await redisClient.flushAll();
      return true;
    } catch (error) {
      logger.error('Cache FLUSH_ALL error:', error.message);
      return false;
    }
  }
};

// Session operations for rate limiting
const sessionOperations = {
  // Set session data
  setSession: async (sessionId, data, ttl = 1800) => {
    return await cacheOperations.set(`session:${sessionId}`, data, ttl);
  },

  // Get session data
  getSession: async (sessionId) => {
    return await cacheOperations.get(`session:${sessionId}`);
  },

  // Delete session
  deleteSession: async (sessionId) => {
    return await cacheOperations.del(`session:${sessionId}`);
  }
};

// Rate limiting operations
const rateLimitOperations = {
  // Increment rate limit counter
  incrementRateLimit: async (key, windowMs) => {
    try {
      if (!redisClient || !redisClient.isOpen) return 1;
      
      const multi = redisClient.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await multi.exec();
      return results[0];
    } catch (error) {
      logger.error(`Rate limit increment error for key ${key}:`, error.message);
      return 1;
    }
  },

  // Get current rate limit count
  getRateLimit: async (key) => {
    try {
      if (!redisClient || !redisClient.isOpen) return 0;
      
      const count = await redisClient.get(key);
      return parseInt(count) || 0;
    } catch (error) {
      logger.error(`Rate limit get error for key ${key}:`, error.message);
      return 0;
    }
  }
};

// Health check for Redis
const checkRedisHealth = async () => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return { status: 'disconnected' };
    }
    
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;
    
    return {
      status: 'connected',
      responseTime: `${responseTime}ms`
    };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};

// Graceful Redis disconnect
const disconnectRedis = async () => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error.message);
  }
};

module.exports = {
  setupRedis,
  getRedisClient,
  cacheOperations,
  sessionOperations,
  rateLimitOperations,
  checkRedisHealth,
  disconnectRedis
}; 