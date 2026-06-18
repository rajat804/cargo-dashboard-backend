const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (id, email, name, role) => {
  return jwt.sign(
    { id, email, name, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Middleware to verify JWT token
const protect = async (req, res, next) => {
  let token;
  let sessionId;
  
  console.log('Auth middleware - checking for token');
  
  sessionId = req.headers['x-session-id'] || req.headers['x-user-session'] || req.body.sessionId;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found, verifying...');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated.'
        });
      }
      
      if (sessionId && user.sessions) {
        const session = user.sessions.find(s => s.sessionId === sessionId && s.isActive);
        if (!session) {
          return res.status(401).json({
            success: false,
            message: 'Session expired or invalid. Please login again.',
            expired: true,
            sessionId: sessionId
          });
        }
        session.lastActivity = new Date();
      }
      
      user.lastActivity = new Date();
      await user.save();
      
      req.user = decoded;
      req.userData = user;
      req.sessionId = sessionId;
      
      console.log('Token verified for user:', decoded.email, 'Role:', decoded.role);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.',
          expired: true
        });
      }
      
      res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }
  
  if (!token) {
    console.log('No token provided');
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};

// Middleware to check if user is admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as admin'
    });
  }
};

// Authorize multiple roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not authenticated'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    next();
  };
};

// Check session status
const checkSession = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const sessionId = req.headers['x-session-id'];
    
    if (!token) {
      return res.status(200).json({
        success: true,
        isLoggedIn: false,
        message: 'No active session'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(200).json({
        success: true,
        isLoggedIn: false,
        message: 'Session expired'
      });
    }
    
    let sessionValid = true;
    if (sessionId && user.sessions) {
      const session = user.sessions.find(s => s.sessionId === sessionId && s.isActive);
      sessionValid = !!session;
    }
    
    return res.status(200).json({
      success: true,
      isLoggedIn: sessionValid,
      user: sessionValid ? {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      } : null,
      message: sessionValid ? 'Session active' : 'Session invalid'
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      isLoggedIn: false,
      message: 'Session invalid'
    });
  }
};

module.exports = {
  protect,
  admin,
  authorize,
  checkSession,
  generateToken
};