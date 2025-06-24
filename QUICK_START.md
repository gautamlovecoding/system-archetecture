# 🚀 Quick Start Guide

## 🏃‍♂️ Get Running in 5 Minutes

### Prerequisites
- **Node.js 16+**: [Download here](https://nodejs.org/)
- **MongoDB**: [Install MongoDB](https://docs.mongodb.com/manual/installation/)
- **Redis**: [Install Redis](https://redis.io/download)

### Option 1: Manual Setup (Recommended for Development)

1. **Install Dependencies**
```bash
npm install
```

2. **Start MongoDB and Redis**
```bash
# MongoDB (in separate terminal)
mongod

# Redis (in separate terminal)  
redis-server
```

3. **Configure Environment**
```bash
# The .env file has been created automatically
# Update it with your actual email credentials if needed
nano .env
```

4. **Start the Application**
```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

5. **Test the Application**
```bash
# Visit in browser or curl
curl http://localhost:5000/health
```

### Option 2: Docker Setup (Easiest)

1. **Start Everything with Docker**
```bash
docker-compose up -d
```

2. **Check Health**
```bash
curl http://localhost:5000/health
```

3. **View Logs**
```bash
docker-compose logs -f app
```

## 🧪 Testing the System Design Features

### 1. URL Shortening (Like Bitly)
```bash
# Create a short URL
curl -X POST http://localhost:5000/api/url/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://github.com/your-repo",
    "customAlias": "mygithub"
  }'

# Access the short URL
curl -L http://localhost:5000/mygithub
```

### 2. User Registration & Authentication
```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepass123",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### 3. File Upload System
```bash
# Upload a file (replace TOKEN with JWT from login)
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.jpg" \
  -F "visibility=public" \
  -F "tags=test,demo"
```

### 4. Real-time Chat (WebSocket)
Open browser console at `http://localhost:5000` and run:
```javascript
const socket = io('/chat');

// Join chat
socket.emit('join', 'user123');

// Send message
socket.emit('private-message', {
  recipientId: 'user456',
  message: 'Hello World!',
  type: 'text'
});

// Listen for messages
socket.on('new-message', (data) => {
  console.log('New message:', data);
});
```

### 5. Search & Filtering
```bash
# Search with filters
curl "http://localhost:5000/api/search/urls?q=github&category=personal&page=1&limit=10"
```

### 6. Rate Limiting Test
```bash
# Send multiple requests quickly to see rate limiting
for i in {1..20}; do
  curl http://localhost:5000/api/url/popular
  echo " - Request $i"
done
```

## 📊 Monitoring & Health Checks

### Application Health
```bash
curl http://localhost:5000/health | jq
```

Response:
```json
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

### View Logs
```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Docker logs (if using Docker)
docker-compose logs -f app
```

## 🛠️ Common Issues & Solutions

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB manually
sudo systemctl start mongod

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping

# Start Redis manually
sudo systemctl start redis

# Connect to Redis CLI
redis-cli
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 PID_NUMBER

# Or use a different port
PORT=3000 npm run dev
```

### Permission Issues (File Uploads)
```bash
# Fix upload directory permissions
chmod 755 uploads/
chown $USER:$USER uploads/
```

## 🔧 Development Tips

### Hot Reloading
The application uses `nodemon` for development:
```bash
npm run dev
```

### Database Debugging
```bash
# Connect to MongoDB
mongo systemdesign_db

# Show collections
show collections

# Query users
db.users.find().limit(5)

# Query URLs
db.urls.find().limit(5)
```

### Redis Debugging
```bash
# Connect to Redis
redis-cli

# See all keys
KEYS *

# Get specific key
GET "rate_limit:127.0.0.1"

# Monitor Redis commands
MONITOR
```

### Testing Individual Components
```bash
# Test URL shortening service
npm test -- --grep "URL"

# Test authentication
npm test -- --grep "auth"

# Test file upload
npm test -- --grep "file"
```

## 📚 Next Steps

1. **Explore the API**: Check `README.md` for full API documentation
2. **Customize Configuration**: Update `.env` with your settings
3. **Add Features**: Extend the codebase with your own implementations
4. **Deploy**: Use the Docker setup for production deployment
5. **Monitor**: Set up logging and monitoring in production

## 🆘 Getting Help

- **Documentation**: Read the comprehensive `README.md`
- **Code Examples**: Check the `src/` directory for implementations
- **Issues**: Common problems are documented in this guide
- **Architecture**: See the system design explanations in `README.md`

## 🎯 What You've Built

This application demonstrates:

✅ **URL Shortening Service** (Like Bitly)
✅ **File Upload System** with security
✅ **Multi-channel Notifications** (Email/SMS/Push)
✅ **Real-time Chat** with WebSockets  
✅ **Advanced Search & Filtering**
✅ **Bulk Operations** with validation
✅ **JWT Authentication & Authorization**
✅ **Rate Limiting & API Protection**
✅ **Redis Caching Strategy**
✅ **Comprehensive Logging**
✅ **Background Job Processing**
✅ **Scalable Database Design**
✅ **RESTful API Design**
✅ **High-Traffic Architecture**
✅ **Production-Ready Deployment**

**Happy coding! 🚀** 