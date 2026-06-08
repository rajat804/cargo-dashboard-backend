const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const protect = async (req, res, next) => {
  let token;
  
  console.log('Auth middleware - checking for token');
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found, verifying...');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      console.log('Token verified for user:', decoded.email);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
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

// Generate JWT token
const generateToken = (id, email, name, role) => {
  return jwt.sign(
    { id, email, name, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

module.exports = {
  protect,
  admin,
  generateToken
};