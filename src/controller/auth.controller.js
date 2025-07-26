const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

class AuthController {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({
          error: 'Validation error',
          details: 'All fields are required',
          code: 'AUTH_VALIDATION_ERROR'
        });
      }
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          details: 'Email is already registered',
          code: 'AUTH_USER_EXISTS'
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, email, password: hashedPassword });
      await user.save();
      
      res.status(201).json({ 
        message: 'User registered successfully',
        userId: user._id 
      });
    } catch (error) {
      console.error('Registration error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Registration failed',
        details: 'Internal server error',
        code: 'AUTH_REGISTRATION_FAILED'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          error: 'Validation error',
          details: 'Email and password are required',
          code: 'AUTH_VALIDATION_ERROR'
        });
      }
      
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          error: 'Authentication failed',
          details: 'Invalid credentials',
          code: 'AUTH_INVALID_CREDENTIALS'
        });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Authentication failed',
          details: 'Invalid credentials',
          code: 'AUTH_INVALID_CREDENTIALS'
        });
      }
      
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '30d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json({
        message: 'Login successful',
        userId: user._id,
        expiresIn: '7d'
      });
    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Login failed',
        details: 'Internal server error',
        code: 'AUTH_LOGIN_FAILED'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({
          error: 'Authentication required',
          details: 'No refresh token provided',
          code: 'AUTH_NO_REFRESH_TOKEN'
        });
      }
      
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      } catch (err) {
        return res.status(401).json({
          error: 'Invalid token',
          details: 'Token verification failed',
          code: 'AUTH_INVALID_TOKEN'
        });
      }

      if (!decoded || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          details: 'Malformed token payload',
          code: 'AUTH_INVALID_TOKEN_PAYLOAD'
        });
      }

      const newToken = jwt.sign(
        { userId: decoded.userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
      });

      res.json({ 
        message: 'Token refreshed successfully',
        expiresIn: '15m'
      });
    } catch (error) {
      console.error('Token refresh error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          details: 'Token verification failed',
          code: 'AUTH_INVALID_TOKEN'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          details: 'Please login again',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      }
      
      res.status(500).json({
        error: 'Token refresh failed',
        details: 'Internal server error',
        code: 'AUTH_REFRESH_FAILED'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { username, email, password } = req.body;
      const userId = req.user.userId;

      if (!username || !email) {
        return res.status(400).json({
          error: 'Validation error',
          details: 'Username and email are required',
          code: 'AUTH_VALIDATION_ERROR'
        });
      }

      const updateData = { username, email };
      if (password) {
        // Hash the password before updating
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({
          error: 'User not found',
          details: 'The specified user does not exist',
          code: 'AUTH_USER_NOT_FOUND'
        });
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email
        }
      });
    } catch (error) {
      console.error('Profile update error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.message,
          code: 'AUTH_VALIDATION_ERROR'
        });
      }
      
      res.status(500).json({
        error: 'Profile update failed',
        details: 'Internal server error',
        code: 'AUTH_UPDATE_FAILED'
      });
    }
  }
}

module.exports = new AuthController();