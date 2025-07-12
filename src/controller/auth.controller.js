const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
class AuthController {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;
      // Make sure this line is properly hashing the password
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, email, password: hashedPassword });
      await user.save();
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) throw new Error('Invalid credentials');
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) throw new Error('Invalid credentials');
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
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/' // Add this line
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/' // Add this line
      });

      res.json({ message: 'Logged in successfully' });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const { username, email,password } = req.body;
      const userId = req.user.userId; // Comes from the auth middleware

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { username, email ,password},
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) throw new Error('No refresh token provided');
  
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
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
  
      res.json({ message: 'Token refreshed successfully' });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();