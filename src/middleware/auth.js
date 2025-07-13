const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    if (!req.cookies) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'No cookies found in request'
      });
    }
    
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required', 
        details: 'No auth token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      return res.status(401).json({
        error: 'Invalid token',
        details: 'Token missing required user ID'
      });
    }
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Authentication error:', {
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
    
    res.status(401).json({
      error: 'Authentication failed',
      details: error.message,
      code: 'AUTH_FAILURE'
    });
  }
};