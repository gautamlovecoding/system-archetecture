# 🚀 System Design Node.js Application

A comprehensive Node.js application demonstrating 15 key system design concepts with practical implementations. This project showcases scalable architecture patterns, best practices, and real-world solutions for building robust web applications.

## 📋 Table of Contents

- [Features](#features)
- [System Design Concepts](#system-design-concepts)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [System Design Deep Dive](#system-design-deep-dive)
- [Scalability Patterns](#scalability-patterns)
- [Security Features](#security-features)
- [Performance Optimizations](#performance-optimizations)
- [Monitoring & Observability](#monitoring--observability)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Features

- **URL Shortening Service** (Like Bitly)
- **File Upload System** with multiple storage backends
- **Multi-channel Notification System** (Email/SMS/Push)
- **Real-time Chat Application** with WebSockets
- **Advanced Search & Filtering** with pagination
- **Bulk Operations** with queue processing
- **Comprehensive Authentication & Authorization**
- **Rate Limiting & API Protection**
- **Caching Strategy** with Redis
- **Logging & Monitoring** system
- **Background Job Processing**
- **Database Schema Design** for complex workflows
- **RESTful API Design** with best practices
- **High-Performance Architecture**
- **Scalability Patterns**

## 🏗️ System Design Concepts

This application implements 15 critical system design concepts:

### 1. URL Shortening Service (Like Bitly)
### 2. File Upload System
### 3. Notification System
### 4. High Traffic Handling
### 5. Caching Strategy
### 6. RESTful API Design
### 7. Authentication & Authorization
### 8. Background Job Processing
### 9. Application Scaling
### 10. Database Schema Design
### 11. Real-time Chat Application
### 12. Rate Limiting
### 13. Logging & Monitoring
### 14. Search with Filters & Pagination
### 15. Bulk Operations with Validation

## 🏛️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │     CDN         │    │   File Storage  │
│   (nginx)       │    │  (Static Files) │    │   (AWS S3/Local)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js Application                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Express   │  │  Socket.IO  │  │    Bull     │             │
│  │   Server    │  │  (Realtime) │  │  (Jobs)     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    MongoDB      │    │     Redis       │    │   Email/SMS     │
│   (Database)    │    │   (Cache)       │    │   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16.0.0
- MongoDB >= 4.4
- Redis >= 6.0
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd system-design-nodejs-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB and Redis**
```bash
# MongoDB
mongod --dbpath /your/db/path

# Redis
redis-server
```

5. **Run the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

6. **Access the application**
- API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 📁 Project Structure

```
system-design-nodejs-app/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── redis.js             # Redis connection & operations
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── urlController.js     # URL shortening
│   │   ├── fileController.js    # File uploads
│   │   ├── notificationController.js
│   │   ├── chatController.js    # Real-time chat
│   │   ├── searchController.js  # Search & filtering
│   │   └── bulkController.js    # Bulk operations
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── rateLimiter.js       # Rate limiting
│   │   └── errorHandler.js      # Error handling
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Url.js               # URL shortening schema
│   │   ├── File.js              # File upload schema
│   │   ├── Notification.js      # Notification schema
│   │   ├── Message.js           # Chat message schema
│   │   └── Complaint.js         # Complaint management
│   ├── routes/
│   │   ├── authRoutes.js        # Authentication endpoints
│   │   ├── urlRoutes.js         # URL shortening endpoints
│   │   ├── fileRoutes.js        # File upload endpoints
│   │   ├── notificationRoutes.js
│   │   ├── chatRoutes.js        # Chat endpoints
│   │   ├── searchRoutes.js      # Search endpoints
│   │   └── bulkRoutes.js        # Bulk operation endpoints
│   ├── services/
│   │   ├── emailService.js      # Email notifications
│   │   ├── smsService.js        # SMS notifications
│   │   ├── pushService.js       # Push notifications
│   │   ├── fileService.js       # File processing
│   │   ├── cacheService.js      # Caching operations
│   │   ├── searchService.js     # Search functionality
│   │   └── socketService.js     # WebSocket handling
│   ├── utils/
│   │   ├── logger.js            # Logging utility
│   │   ├── validators.js        # Input validation
│   │   ├── helpers.js           # Helper functions
│   │   └── constants.js         # Application constants
│   └── jobs/
│       ├── emailJob.js          # Email job processor
│       ├── fileProcessingJob.js # File processing
│       └── cleanupJob.js        # Cleanup tasks
├── uploads/                     # File upload directory
├── logs/                        # Application logs
├── tests/                       # Test files
├── docs/                        # Documentation
├── scripts/                     # Utility scripts
├── package.json
├── server.js                    # Application entry point
└── README.md
```

## 🔧 API Documentation with cURL Examples

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }'
```

#### 2. Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Refresh Token
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

#### 4. Get Profile
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer your_access_token_here"
```

#### 5. Update Profile
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "profile": {
      "firstName": "Jane",
      "lastName": "Smith",
      "bio": "Software Developer"
    }
  }'
```

#### 6. Change Password
```bash
curl -X PUT http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }'
```

#### 7. Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer your_access_token_here"
```

### URL Shortening Endpoints

#### 1. Create Short URL
```bash
curl -X POST http://localhost:5000/api/urls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "originalUrl": "https://www.example.com/very/long/url",
    "customAlias": "myurl",
    "category": "tech",
    "tags": ["example", "demo"],
    "expiresAt": "2024-12-31T23:59:59Z"
  }'
```

#### 2. Access Short URL (Redirect)
```bash
curl -X GET http://localhost:5000/api/urls/abc123 \
  -L
```

#### 3. Get URL Analytics
```bash
curl -X GET http://localhost:5000/api/urls/analytics/abc123 \
  -H "Authorization: Bearer your_access_token_here"
```

#### 4. Get User URLs
```bash
curl -X GET "http://localhost:5000/api/urls/user/urls?page=1&limit=10&category=tech" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 5. Update URL
```bash
curl -X PUT http://localhost:5000/api/urls/url_id_here \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "category": "business",
    "tags": ["updated", "tag"],
    "isActive": true
  }'
```

#### 6. Delete URL
```bash
curl -X DELETE http://localhost:5000/api/urls/url_id_here \
  -H "Authorization: Bearer your_access_token_here"
```

### File Upload Endpoints

#### 1. Upload Single File
```bash
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer your_access_token_here" \
  -F "file=@/path/to/your/file.pdf" \
  -F "visibility=public" \
  -F "tags=document,important" \
  -F "description=Sample document"
```

#### 2. Upload Multiple Files
```bash
curl -X POST http://localhost:5000/api/files/upload/multiple \
  -H "Authorization: Bearer your_access_token_here" \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.jpg" \
  -F "visibility=private" \
  -F "tags=images,photos"
```

#### 3. Get File by ID
```bash
curl -X GET http://localhost:5000/api/files/file_id_here \
  -H "Authorization: Bearer your_access_token_here"
```

#### 4. Download File
```bash
curl -X GET http://localhost:5000/api/files/file_id_here/download \
  -H "Authorization: Bearer your_access_token_here" \
  -O
```

#### 5. Get User Files
```bash
curl -X GET "http://localhost:5000/api/files/user/files?page=1&limit=10&visibility=public" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 6. Update File Metadata
```bash
curl -X PUT http://localhost:5000/api/files/file_id_here \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "visibility": "private",
    "tags": ["updated", "metadata"],
    "description": "Updated description"
  }'
```

#### 7. Create Share Link
```bash
curl -X POST http://localhost:5000/api/files/file_id_here/share \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "expiresIn": 86400000
  }'
```

### Notification Endpoints

#### 1. Send Notification
```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "recipients": ["user@example.com", "user2@example.com"],
    "type": "email",
    "subject": "Welcome!",
    "message": "Thank you for joining our platform!",
    "template": "welcome",
    "priority": "normal"
  }'
```

#### 2. Send Bulk Notifications
```bash
curl -X POST http://localhost:5000/api/notifications/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "userQuery": {"subscription": "premium"},
    "type": "email",
    "subject": "Premium Update",
    "message": "New features available for premium users!",
    "template": "update",
    "priority": "high"
  }'
```

#### 3. Get User Notifications
```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=20&type=email&status=sent" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 4. Get Notification by ID
```bash
curl -X GET http://localhost:5000/api/notifications/notification_id_here \
  -H "Authorization: Bearer your_access_token_here"
```

#### 5. Get Notification Statistics
```bash
curl -X GET "http://localhost:5000/api/notifications/stats?timeframe=week" \
  -H "Authorization: Bearer your_access_token_here"
```

### Chat Endpoints

#### 1. Send Message
```bash
curl -X POST http://localhost:5000/api/chat/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "recipientId": "recipient_user_id",
    "message": "Hello, how are you?",
    "type": "text"
  }'
```

#### 2. Get Chat History
```bash
curl -X GET "http://localhost:5000/api/chat/history/user_id_here?page=1&limit=50" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 3. Get Conversations
```bash
curl -X GET "http://localhost:5000/api/chat/conversations?page=1&limit=20" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 4. Mark Message as Read
```bash
curl -X PUT http://localhost:5000/api/chat/message/message_id_here/read \
  -H "Authorization: Bearer your_access_token_here"
```

#### 5. Edit Message
```bash
curl -X PUT http://localhost:5000/api/chat/message/message_id_here \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "message": "Updated message content"
  }'
```

#### 6. Get Unread Count
```bash
curl -X GET http://localhost:5000/api/chat/unread-count \
  -H "Authorization: Bearer your_access_token_here"
```

### Complaint Management Endpoints

#### 1. Create Complaint
```bash
curl -X POST http://localhost:5000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "category": "technical",
    "priority": "high",
    "title": "Login Issue",
    "description": "Unable to login to my account",
    "tags": ["login", "urgent"]
  }'
```

#### 2. Get User Complaints
```bash
curl -X GET "http://localhost:5000/api/complaints/user?page=1&limit=20&status=open" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 3. Get Complaint by ID
```bash
curl -X GET http://localhost:5000/api/complaints/complaint_id_here \
  -H "Authorization: Bearer your_access_token_here"
```

#### 4. Add Message to Complaint
```bash
curl -X POST http://localhost:5000/api/complaints/complaint_id_here/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "message": "Additional information about the issue"
  }'
```

#### 5. Update Complaint Status (Admin)
```bash
curl -X PUT http://localhost:5000/api/complaints/complaint_id_here/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_access_token_here" \
  -d '{
    "status": "in-progress",
    "assignedTo": "admin_user_id"
  }'
```

#### 6. Rate Complaint Resolution
```bash
curl -X PUT http://localhost:5000/api/complaints/complaint_id_here/rate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "rating": 5,
    "feedback": "Excellent support!"
  }'
```

### Search Endpoints

#### 1. Universal Search
```bash
curl -X GET "http://localhost:5000/api/search?q=example&entities=urls,files&page=1&limit=20" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 2. Search URLs
```bash
curl -X GET "http://localhost:5000/api/search/urls?q=tech&category=technology&minClicks=10&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 3. Search Files
```bash
curl -X GET "http://localhost:5000/api/search/files?q=document&mimetype=pdf&minSize=1000&visibility=public" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 4. Get Search Suggestions
```bash
curl -X GET "http://localhost:5000/api/search/suggestions?q=tech&type=urls" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 5. Get Popular Search Terms
```bash
curl -X GET http://localhost:5000/api/search/popular-terms
```

### Bulk Operations Endpoints

#### 1. Start Bulk Import
```bash
curl -X POST http://localhost:5000/api/bulk/import \
  -H "Authorization: Bearer your_access_token_here" \
  -F "file=@/path/to/import.csv" \
  -F "operation=import_users"
```

#### 2. Get Bulk Operations
```bash
curl -X GET "http://localhost:5000/api/bulk/operations?page=1&limit=10&status=completed" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 3. Get Operation Status
```bash
curl -X GET http://localhost:5000/api/bulk/operation/operation_id_here \
  -H "Authorization: Bearer your_access_token_here"
```

#### 4. Get Operation Results
```bash
curl -X GET "http://localhost:5000/api/bulk/operation/operation_id_here/results?page=1&limit=50&success=true" \
  -H "Authorization: Bearer your_access_token_here"
```

#### 5. Download CSV Template
```bash
curl -X GET http://localhost:5000/api/bulk/template/import_users \
  -H "Authorization: Bearer your_access_token_here" \
  -O
```

#### 6. Cancel Bulk Operation
```bash
curl -X POST http://localhost:5000/api/bulk/operation/operation_id_here/cancel \
  -H "Authorization: Bearer your_access_token_here"
```

### Monitoring Endpoints

#### 1. Health Check
```bash
curl -X GET http://localhost:5000/api/monitoring/health
```

#### 2. Get System Metrics (Admin)
```bash
curl -X GET http://localhost:5000/api/monitoring/metrics \
  -H "Authorization: Bearer admin_access_token_here"
```

#### 3. Get Performance Metrics (Admin)
```bash
curl -X GET "http://localhost:5000/api/monitoring/performance?timeframe=1h" \
  -H "Authorization: Bearer admin_access_token_here"
```

#### 4. Get Server Statistics (Admin)
```bash
curl -X GET http://localhost:5000/api/monitoring/server \
  -H "Authorization: Bearer admin_access_token_here"
```

#### 5. Get Application Logs (Admin)
```bash
curl -X GET "http://localhost:5000/api/monitoring/logs?level=error&limit=100&since=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer admin_access_token_here"
```

#### 6. Clear Cache (Admin)
```bash
curl -X POST http://localhost:5000/api/monitoring/cache/clear \
  -H "Authorization: Bearer admin_access_token_here"
```

#### 7. Get Configuration (Admin)
```bash
curl -X GET http://localhost:5000/api/monitoring/config \
  -H "Authorization: Bearer admin_access_token_here"
```

#### 8. Get System Alerts (Admin)
```bash
curl -X GET http://localhost:5000/api/monitoring/alerts \
  -H "Authorization: Bearer admin_access_token_here"
```

### Error Response Format
All endpoints return errors in this format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status": 400,
    "code": "VALIDATION_ERROR"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Success Response Format
All endpoints return success responses in this format:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Rate Limiting
- Most endpoints: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- File uploads: 5 requests per minute
- Bulk operations: 2 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🔍 System Design Deep Dive

### 1. URL Shortening Service (Like Bitly)

**Implementation Details:**
- **Base62 Encoding**: Uses custom short codes for URL generation
- **Database Schema**: Optimized for read-heavy workloads
- **Analytics Tracking**: Comprehensive click analytics with geo-location
- **Caching Strategy**: Redis caching for popular URLs
- **Custom Aliases**: Support for user-defined short codes

**Key Features:**
```javascript
// URL Analytics Structure
{
  totalClicks: 1234,
  uniqueClicks: 567,
  clicksToday: 45,
  geoStats: [
    { country: "US", clicks: 789 },
    { country: "UK", clicks: 234 }
  ],
  deviceStats: [
    { browser: "Chrome", clicks: 456 },
    { browser: "Firefox", clicks: 123 }
  ]
}
```

**Scalability Considerations:**
- **Read Replicas**: Separate read/write database instances
- **Sharding Strategy**: Shard by URL hash for horizontal scaling
- **CDN Integration**: Cache static assets and popular redirects
- **Rate Limiting**: Prevent abuse with IP-based rate limiting

### 2. File Upload System

**Architecture:**
```
Client → Express → Multer → Storage (Local/S3) → Database
                      ↓
                  Virus Scan → Thumbnail Generation → Metadata Extraction
```

**Key Components:**
- **Multer Middleware**: Handles multipart file uploads
- **Storage Backends**: Local filesystem and AWS S3 support
- **File Processing**: Async thumbnail generation and metadata extraction
- **Security**: Virus scanning and file type validation
- **Access Control**: Public, private, and shared file permissions

**Scalability Features:**
```javascript
// File Processing Pipeline
const fileProcessingPipeline = {
  upload: async (file) => {
    // 1. Validate file type and size
    // 2. Generate unique filename
    // 3. Store in primary storage
    // 4. Queue background processing
    // 5. Return file metadata
  },
  
  process: async (fileId) => {
    // 1. Virus scan
    // 2. Generate thumbnails
    // 3. Extract metadata
    // 4. Create backup
    // 5. Update database
  }
};
```

### 3. Notification System (Email/SMS/Push)

**Multi-Channel Architecture:**
```
Notification Request → Queue → Channel Router → Service Provider → Delivery
                        ↓
                   Retry Logic → Dead Letter Queue → Manual Review
```

**Implementation:**
```javascript
// Notification Service
const notificationService = {
  send: async (notification) => {
    const { type, recipients, template, data } = notification;
    
    switch (type) {
      case 'email':
        return await emailService.send(recipients, template, data);
      case 'sms':
        return await smsService.send(recipients, template, data);
      case 'push':
        return await pushService.send(recipients, template, data);
    }
  },
  
  // Batch processing for bulk notifications
  sendBatch: async (notifications) => {
    const batches = chunk(notifications, 100);
    return await Promise.allSettled(
      batches.map(batch => processBatch(batch))
    );
  }
};
```

**Features:**
- **Template Engine**: Dynamic content with variables
- **Delivery Tracking**: Open rates, click-through rates
- **Retry Logic**: Exponential backoff for failed deliveries
- **Unsubscribe Management**: Compliance with regulations
- **A/B Testing**: Template performance comparison

### 4. High Traffic Handling

**Load Balancing Strategy:**
```
Internet → Load Balancer → [Node.js Instance 1]
                        → [Node.js Instance 2]
                        → [Node.js Instance 3]
```

**Techniques Implemented:**
```javascript
// Connection pooling
const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0
};

// Request timeout handling
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// Memory usage monitoring
const monitorMemory = () => {
  const used = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`
  });
};
```

### 5. Caching Strategy

**Multi-Level Caching:**
```
Application Cache (In-Memory) → Redis Cache → Database
```

**Implementation:**
```javascript
// Cache service with TTL and invalidation
const cacheService = {
  get: async (key) => {
    // Try in-memory cache first
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }
    
    // Try Redis cache
    const cached = await redis.get(key);
    if (cached) {
      memoryCache.set(key, JSON.parse(cached));
      return JSON.parse(cached);
    }
    
    return null;
  },
  
  set: async (key, value, ttl = 3600) => {
    // Set in both memory and Redis
    memoryCache.set(key, value);
    await redis.setex(key, ttl, JSON.stringify(value));
  },
  
  invalidate: async (pattern) => {
    // Invalidate matching keys
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      keys.forEach(key => memoryCache.delete(key));
    }
  }
};
```

**Caching Strategies:**
- **Cache-Aside**: Application manages cache
- **Write-Through**: Write to cache and database simultaneously
- **Write-Behind**: Write to cache first, database later
- **Cache Warming**: Pre-populate cache with frequently accessed data

### 6. RESTful API Design

**Resource-Based URLs:**
```
GET    /api/users           # List users
POST   /api/users           # Create user
GET    /api/users/:id       # Get user
PUT    /api/users/:id       # Update user
DELETE /api/users/:id       # Delete user

GET    /api/users/:id/posts # User's posts (nested resource)
```

**HTTP Status Codes:**
```javascript
// Response helper
const sendResponse = (res, statusCode, data, message = 'Success') => {
  res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Usage examples
sendResponse(res, 200, users, 'Users retrieved successfully');
sendResponse(res, 201, user, 'User created successfully');
sendResponse(res, 400, null, 'Invalid input data');
sendResponse(res, 404, null, 'User not found');
```

### 7. Authentication & Authorization

**JWT-Based Authentication:**
```javascript
// Token generation
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Role-based access control
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

**Permission System:**
```javascript
// Permission-based authorization
const hasPermission = (user, permission) => {
  return user.permissions.includes(permission) || user.role === 'admin';
};

// Usage in routes
app.get('/api/admin/users', 
  authenticate, 
  requirePermission('read:all_users'),
  getUsersController
);
```

### 8. Background Job Processing

**Bull Queue Implementation:**
```javascript
// Job queue setup
const Queue = require('bull');
const emailQueue = new Queue('email processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Job processor
emailQueue.process('send-email', 10, async (job) => {
  const { recipients, template, data } = job.data;
  
  try {
    await emailService.send(recipients, template, data);
    return { success: true, sentAt: new Date() };
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
});

// Add job to queue
const queueEmail = async (emailData) => {
  await emailQueue.add('send-email', emailData, {
    attempts: 3,
    backoff: 'exponential',
    delay: 5000
  });
};
```

**Job Types:**
- **Email Processing**: Batch email sending
- **File Processing**: Image resizing, video conversion
- **Data Cleanup**: Remove expired records
- **Report Generation**: Generate and email reports
- **Webhook Notifications**: External service notifications

### 9. Application Scaling

**Horizontal Scaling:**
```javascript
// Cluster module for multi-core utilization
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart worker
  });
} else {
  // Worker process
  require('./server.js');
  console.log(`Worker ${process.pid} started`);
}
```

**Database Scaling:**
```javascript
// Read/Write splitting
const readDB = mongoose.createConnection(READ_DB_URL);
const writeDB = mongoose.createConnection(WRITE_DB_URL);

// Model usage
const UserRead = readDB.model('User', userSchema);
const UserWrite = writeDB.model('User', userSchema);

// Usage in services
const getUserById = async (id) => {
  return await UserRead.findById(id);
};

const createUser = async (userData) => {
  return await UserWrite.create(userData);
};
```

### 10. Database Schema Design

**Complaint Management System:**
```javascript
// Complaint schema with optimized indexes
const complaintSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, required: true },
  userId: { type: ObjectId, ref: 'User', required: true },
  category: { 
    type: String, 
    enum: ['technical', 'billing', 'general'],
    required: true 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium' 
  },
  status: { 
    type: String, 
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open' 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedTo: { type: ObjectId, ref: 'User' },
  
  // Conversation thread
  messages: [{
    author: { type: ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    attachments: [{ type: ObjectId, ref: 'File' }]
  }],
  
  // Tracking fields
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resolvedAt: Date,
  closedAt: Date,
  
  // SLA tracking
  slaBreached: { type: Boolean, default: false },
  responseTime: Number, // in minutes
  resolutionTime: Number // in minutes
});

// Indexes for performance
complaintSchema.index({ userId: 1, status: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ category: 1, priority: 1 });
complaintSchema.index({ createdAt: -1 });
```

### 11. Real-time Chat Application

**WebSocket Implementation:**
```javascript
// Socket.IO setup
const io = require('socket.io')(server);

// Chat namespace
const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their room
  socket.on('join', (userId) => {
    socket.join(userId);
    socket.userId = userId;
  });
  
  // Handle private messages
  socket.on('private-message', async (data) => {
    const { recipientId, message, type } = data;
    
    // Save message to database
    const chatMessage = await Message.create({
      sender: socket.userId,
      recipient: recipientId,
      message,
      type,
      timestamp: new Date()
    });
    
    // Send to recipient
    chatNamespace.to(recipientId).emit('new-message', {
      id: chatMessage._id,
      sender: socket.userId,
      message,
      type,
      timestamp: chatMessage.timestamp
    });
    
    // Send delivery confirmation
    socket.emit('message-delivered', { messageId: chatMessage._id });
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(data.recipientId).emit('user-typing', {
      userId: socket.userId,
      isTyping: data.isTyping
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
```

**Message Features:**
- **Real-time Delivery**: Instant message delivery
- **Typing Indicators**: Show when users are typing
- **Message Status**: Sent, delivered, read receipts
- **File Sharing**: Image and document sharing
- **Message Search**: Full-text search in chat history

### 12. Rate Limiting Implementation

**Multi-tier Rate Limiting:**
```javascript
// Different limits for different endpoints
const rateLimits = {
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: 'Too many authentication attempts'
  }),
  
  api: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requests per window
    message: 'Too many API requests'
  }),
  
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: 'Too many file uploads'
  })
};

// Usage in routes
app.use('/api/auth', rateLimits.auth);
app.use('/api', rateLimits.api);
app.use('/api/files/upload', rateLimits.upload);
```

**Advanced Rate Limiting:**
```javascript
// User-tier based rate limiting
const createTieredRateLimit = (getUserTier) => {
  const tierLimits = {
    free: { max: 100, windowMs: 15 * 60 * 1000 },
    premium: { max: 1000, windowMs: 15 * 60 * 1000 },
    enterprise: { max: 10000, windowMs: 15 * 60 * 1000 }
  };
  
  return async (req, res, next) => {
    const userTier = getUserTier(req.user);
    const limits = tierLimits[userTier];
    
    const limiter = rateLimit({
      windowMs: limits.windowMs,
      max: limits.max,
      keyGenerator: (req) => req.user.id
    });
    
    return limiter(req, res, next);
  };
};
```

### 13. Logging & Monitoring

**Structured Logging:**
```javascript
// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Custom logging methods
const systemLogger = {
  http: (req, res, responseTime) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  },
  
  database: (operation, collection, executionTime) => {
    logger.info('Database Operation', {
      operation,
      collection,
      executionTime: `${executionTime}ms`
    });
  },
  
  security: (event, details, severity = 'medium') => {
    logger.warn('Security Event', {
      event,
      severity,
      ...details
    });
  }
};
```

**Application Monitoring:**
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await checkDatabaseHealth(),
    redis: await checkRedisHealth(),
    version: process.env.npm_package_version
  };
  
  res.status(200).json(healthCheck);
});

// Performance monitoring
const performanceMonitor = (threshold = 1000) => {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      if (duration > threshold) {
        logger.warn('Slow Request', {
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`
        });
      }
    });
    
    next();
  };
};
```

### 14. Search with Filters & Pagination

**Advanced Search Implementation:**
```javascript
// Search service with multiple filters
const searchService = {
  search: async (query, filters = {}, pagination = {}) => {
    const {
      q, // text search
      category,
      dateFrom,
      dateTo,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;
    
    const {
      page = 1,
      limit = 20,
      offset = 0
    } = pagination;
    
    // Build MongoDB aggregation pipeline
    const pipeline = [];
    
    // Match stage
    const matchStage = {};
    
    if (q) {
      matchStage.$text = { $search: q };
    }
    
    if (category) {
      matchStage.category = category;
    }
    
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }
    
    if (tags && tags.length > 0) {
      matchStage.tags = { $in: tags };
    }
    
    pipeline.push({ $match: matchStage });
    
    // Sort stage
    const sortStage = {};
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortStage });
    
    // Facet stage for pagination and count
    pipeline.push({
      $facet: {
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ],
        count: [
          { $count: 'total' }
        ]
      }
    });
    
    const result = await Model.aggregate(pipeline);
    const data = result[0].data;
    const total = result[0].count[0]?.total || 0;
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
};
```

**Search Optimizations:**
```javascript
// Text indexes for full-text search
schema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

// Compound indexes for common filter combinations
schema.index({ category: 1, createdAt: -1 });
schema.index({ tags: 1, category: 1 });
schema.index({ userId: 1, createdAt: -1 });
```

### 15. Bulk Operations with Validation

**Bulk Processing Pipeline:**
```javascript
// Bulk operation service
const bulkService = {
  processFile: async (fileId, userId, operation) => {
    const file = await File.findById(fileId);
    if (!file) throw new Error('File not found');
    
    const workbook = XLSX.readFile(file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const bulkOp = await BulkOperation.create({
      userId,
      operation,
      status: 'processing',
      totalRecords: data.length,
      processedRecords: 0,
      errors: []
    });
    
    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await processBatch(batch, bulkOp, operation);
    }
    
    bulkOp.status = 'completed';
    bulkOp.completedAt = new Date();
    await bulkOp.save();
    
    return bulkOp;
  },
  
  processBatch: async (batch, bulkOp, operation) => {
    const results = await Promise.allSettled(
      batch.map(record => processRecord(record, operation))
    );
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        bulkOp.processedRecords++;
      } else {
        bulkOp.errors.push({
          row: bulkOp.processedRecords + index + 1,
          error: result.reason.message,
          data: batch[index]
        });
      }
    });
    
    await bulkOp.save();
  }
};
```

**Validation Schema:**
```javascript
// Joi validation for bulk data
const bulkValidationSchema = {
  users: Joi.array().items(
    Joi.object({
      username: Joi.string().min(3).max(30).required(),
      email: Joi.string().email().required(),
      firstName: Joi.string().max(50),
      lastName: Joi.string().max(50),
      role: Joi.string().valid('user', 'admin', 'moderator')
    })
  ),
  
  urls: Joi.array().items(
    Joi.object({
      originalUrl: Joi.string().uri().required(),
      customAlias: Joi.string().min(3).max(50),
      category: Joi.string().valid('business', 'personal', 'marketing'),
      tags: Joi.array().items(Joi.string().max(30))
    })
  )
};
```

## 🔐 Security Features

### Authentication Security
- **JWT Token Management**: Secure token generation and validation
- **Refresh Token Rotation**: Automatic token refresh mechanism
- **Password Hashing**: bcrypt with configurable salt rounds
- **Rate Limiting**: Prevent brute force attacks
- **Account Lockout**: Temporary lockout after failed attempts

### Data Protection
- **Input Validation**: Comprehensive validation using Joi
- **SQL Injection Prevention**: Mongoose ODM protection
- **XSS Prevention**: Helmet.js security headers
- **CORS Configuration**: Controlled cross-origin requests
- **File Upload Security**: File type and size validation

### Monitoring & Auditing
- **Security Event Logging**: Track authentication attempts
- **Access Logging**: Monitor API access patterns
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Track slow queries and requests

## ⚡ Performance Optimizations

### Database Optimizations
- **Indexing Strategy**: Optimized indexes for query patterns
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Aggregation pipelines for complex queries
- **Data Pagination**: Efficient large dataset handling

### Caching Strategy
- **Multi-level Caching**: Memory, Redis, and database caching
- **Cache Invalidation**: Smart cache invalidation strategies
- **Cache Warming**: Pre-populate frequently accessed data
- **Cache Monitoring**: Track cache hit/miss ratios

### Application Performance
- **Compression**: Gzip compression for responses
- **Static File Serving**: Efficient static asset delivery
- **Request Timeout**: Prevent hanging requests
- **Memory Management**: Monitor and optimize memory usage

## 📊 Monitoring & Observability

### Health Checks
```javascript
// Comprehensive health check
GET /health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "memory": {
    "rss": "150 MB",
    "heapTotal": "120 MB",
    "heapUsed": "80 MB"
  },
  "database": {
    "status": "connected",
    "host": "localhost",
    "responseTime": "5ms"
  },
  "redis": {
    "status": "connected",
    "responseTime": "2ms"
  }
}
```

### Metrics Collection
- **Response Time Tracking**: Monitor API response times
- **Error Rate Monitoring**: Track error rates and types
- **Resource Usage**: Monitor CPU, memory, and disk usage
- **Business Metrics**: Track user activity and feature usage

### Alerting
- **Threshold Alerts**: Alert on metric thresholds
- **Error Alerts**: Immediate alerts for critical errors
- **Performance Alerts**: Alert on performance degradation
- **Security Alerts**: Alert on security events

## 🚀 Deployment

### Docker Setup
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/systemdesign
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
  
  mongo:
    image: mongo:4.4
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"
  
  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

volumes:
  mongo-data:
```

### Production Considerations
- **Environment Variables**: Secure configuration management
- **SSL/TLS**: HTTPS encryption for all communications
- **Load Balancing**: Distribute traffic across instances
- **Database Clustering**: High availability database setup
- **Backup Strategy**: Regular database and file backups

## 🧪 Testing

### Unit Tests
```javascript
// Example test file
const request = require('supertest');
const app = require('../server');

describe('URL Shortening API', () => {
  test('should create a short URL', async () => {
    const response = await request(app)
      .post('/api/url/shorten')
      .send({
        originalUrl: 'https://example.com/test'
      })
      .expect(201);
    
    expect(response.body.data.shortUrl).toBeDefined();
    expect(response.body.data.originalUrl).toBe('https://example.com/test');
  });
});
```

### Integration Tests
```javascript
// Database integration test
describe('User Service', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });
  
  test('should create and retrieve user', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    
    const user = await userService.createUser(userData);
    expect(user.email).toBe(userData.email);
    
    const retrievedUser = await userService.getUserById(user._id);
    expect(retrievedUser.username).toBe(userData.username);
  });
});
```

### Load Testing
```javascript
// Artillery configuration
{
  "config": {
    "target": "http://localhost:5000",
    "phases": [
      {
        "duration": 300,
        "arrivalRate": 10
      }
    ]
  },
  "scenarios": [{
    "name": "API Load Test",
    "requests": [{
      "get": {
        "url": "/api/url/popular"
      }
    }]
  }]
}
```

## 📚 Additional Resources

### Design Patterns Used
- **Repository Pattern**: Data access abstraction
- **Factory Pattern**: Service instantiation
- **Observer Pattern**: Event-driven architecture
- **Singleton Pattern**: Database connections
- **Middleware Pattern**: Request processing pipeline

### Best Practices Implemented
- **SOLID Principles**: Clean code architecture
- **DRY Principle**: Don't repeat yourself
- **Separation of Concerns**: Modular code organization
- **Error Handling**: Comprehensive error management
- **Documentation**: Inline code documentation

### Further Reading
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [Redis Best Practices](https://redis.io/topics/memory-optimization)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

### Code Style
- Use ESLint configuration provided
- Follow conventional commit messages
- Add tests for new features
- Update documentation for changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **System Design Demo** - *Initial work*

## 🙏 Acknowledgments

- Express.js community for excellent documentation
- MongoDB team for robust database solutions
- Redis team for high-performance caching
- All open-source contributors who make projects like this possible

---

**Note**: This is a comprehensive system design demonstration project. For production use, additional security measures, monitoring, and testing should be implemented based on specific requirements.

## 🔗 Quick Links

- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Architecture Diagrams](./docs/architecture.md)
- [Performance Benchmarks](./docs/performance.md)
- [Security Checklist](./docs/security.md)

---

*Built with ❤️ using Node.js, Express, MongoDB, and Redis* 