const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { sendSuccessResponse, sendErrorResponse, createError, catchAsync } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Register new user
const register = catchAsync(async (req, res) => {
  const { username, email, password, profile } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email }, { username }] 
  });
  
  if (existingUser) {
    return sendErrorResponse(res, 400, 'User already exists with this email or username');
  }
  
  // Create new user
  const user = await User.create({
    username,
    email,
    password,
    profile: profile || {}
  });
  
  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();
  
  logger.auth('User Registration', user._id, true, { email, username });
  
  sendSuccessResponse(res, 201, {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      profile: user.profile,
      role: user.role,
      subscription: user.subscription
    },
    tokens: {
      accessToken,
      refreshToken
    }
  }, 'User registered successfully');
});

// Login user
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return sendErrorResponse(res, 400, 'Email and password are required');
  }
  
  // Find user and include password
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password))) {
    logger.auth('Login Failed', null, false, { email, reason: 'Invalid credentials' });
    return sendErrorResponse(res, 401, 'Invalid email or password');
  }
  
  if (!user.isActive) {
    logger.auth('Login Failed', user._id, false, { email, reason: 'Account deactivated' });
    return sendErrorResponse(res, 401, 'Account is deactivated');
  }
  
  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Save refresh token and update last login
  user.refreshToken = refreshToken;
  await user.updateLastLogin();
  
  logger.auth('User Login', user._id, true, { email });
  
  sendSuccessResponse(res, 200, {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      profile: user.profile,
      role: user.role,
      subscription: user.subscription,
      lastLogin: user.lastLogin
    },
    tokens: {
      accessToken,
      refreshToken
    }
  }, 'Login successful');
});

// Refresh access token
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return sendErrorResponse(res, 400, 'Refresh token is required');
  }
  
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');
    
    if (!user || user.refreshToken !== refreshToken) {
      return sendErrorResponse(res, 401, 'Invalid refresh token');
    }
    
    if (!user.isActive) {
      return sendErrorResponse(res, 401, 'Account is deactivated');
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();
    
    sendSuccessResponse(res, 200, {
      tokens
    }, 'Tokens refreshed successfully');
    
  } catch (error) {
    logger.error('Refresh token error:', error);
    sendErrorResponse(res, 401, 'Invalid refresh token');
  }
});

// Logout user
const logout = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
  
  logger.auth('User Logout', req.user._id, true);
  
  sendSuccessResponse(res, 200, null, 'Logged out successfully');
});

// Get current user profile
const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('profile')
    .select('-refreshToken');
  
  sendSuccessResponse(res, 200, {
    user
  }, 'Profile retrieved successfully');
});

// Update user profile
const updateProfile = catchAsync(async (req, res) => {
  const allowedUpdates = ['profile.firstName', 'profile.lastName', 'profile.bio', 'profile.avatar'];
  const updates = {};
  
  // Filter allowed updates
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key) || key.startsWith('profile.')) {
      if (key.startsWith('profile.')) {
        const profileKey = key.replace('profile.', '');
        if (!updates.profile) updates.profile = {};
        updates.profile[profileKey] = req.body[key];
      } else {
        updates[key] = req.body[key];
      }
    }
  });
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-refreshToken');
  
  logger.business('Profile Updated', { userId: user._id, updates });
  
  sendSuccessResponse(res, 200, {
    user
  }, 'Profile updated successfully');
});

// Change password
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return sendErrorResponse(res, 400, 'Current password and new password are required');
  }
  
  const user = await User.findById(req.user._id).select('+password');
  
  if (!(await user.comparePassword(currentPassword))) {
    return sendErrorResponse(res, 400, 'Current password is incorrect');
  }
  
  user.password = newPassword;
  await user.save();
  
  logger.security('Password Changed', { userId: user._id }, 'medium');
  
  sendSuccessResponse(res, 200, null, 'Password changed successfully');
});

// Delete account
const deleteAccount = catchAsync(async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return sendErrorResponse(res, 400, 'Password is required to delete account');
  }
  
  const user = await User.findById(req.user._id).select('+password');
  
  if (!(await user.comparePassword(password))) {
    return sendErrorResponse(res, 400, 'Password is incorrect');
  }
  
  // Soft delete by deactivating account
  user.isActive = false;
  await user.save();
  
  logger.security('Account Deleted', { userId: user._id }, 'high');
  
  sendSuccessResponse(res, 200, null, 'Account deleted successfully');
});

// Get all users (admin only)
const getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, subscription, search } = req.query;
  
  const query = { isActive: true };
  
  if (role) query.role = role;
  if (subscription) query.subscription = subscription;
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } }
    ];
  }
  
  const users = await User.find(query)
    .select('-refreshToken')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await User.countDocuments(query);
  
  sendSuccessResponse(res, 200, {
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Users retrieved successfully');
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getAllUsers
}; 