const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
// Remove: const bcrypt = require('bcryptjs'); - bcrypt is already in the User model

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for email:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    console.log('User found:', user.email, 'Role:', user.role);
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.'
      });
    }
    
    // Use the model's matchPassword method
    const isPasswordMatch = await user.matchPassword(password);
    console.log('Password match result:', isPasswordMatch);
    
    if (!isPasswordMatch) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    const token = generateToken(user._id, user.email, user.name, user.role);
    console.log('Login successful for:', email);
    
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: token
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Select/Update branch after login
// @route   POST /api/auth/select-branch
const selectBranch = async (req, res) => {
  try {
    const { branch, branchCode } = req.body;
    const userId = req.user.id;
    
    console.log('Select branch for user:', userId, 'Branch:', branch);
    
    if (!branch || !branchCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide branch name and code'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.branch = branch;
    user.branchCode = branchCode;
    user.lastLoginBranch = branch;
    await user.save();
    
    console.log('Branch selected successfully for user:', userId);
    
    res.status(200).json({
      success: true,
      data: {
        branch: user.branch,
        branchCode: user.branchCode
      },
      message: 'Branch selected successfully'
    });
  } catch (error) {
    console.error('Select branch error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user with branch info
// @route   GET /api/auth/me
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logoutUser = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  loginUser,
  selectBranch,
  getCurrentUser,
  logoutUser
};