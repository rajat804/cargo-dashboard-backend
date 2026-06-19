const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const crypto = require('crypto');

// Helper: Generate unique session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// ============ ADMIN LOGIN ============
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Admin login attempt for email:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin rights required.'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }
    
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const sessionId = generateSessionId();
    
    if (!user.sessions) {
      user.sessions = [];
    }
    
    user.sessions.push({
      sessionId: sessionId,
      loginTime: new Date(),
      lastActivity: new Date(),
      isActive: true,
      role: user.role,
      deviceInfo: req.headers['user-agent'] || 'Unknown'
    });
    
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    await user.save();
    
    const token = generateToken(user._id, user.email, user.name, user.role);
    
    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch || '',
        branchCode: user.branchCode || '',
        modules: user.modules || [],  // ✅ ADD THIS
        token: token,
        sessionId: sessionId,
        userType: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ SELECT BRANCH ============
// const selectBranch = async (req, res) => {
//   try {
//     const { branch, branchCode } = req.body;
//     const userId = req.user.id;
    
//     console.log('Select branch for user:', userId, 'Branch:', branch);
    
//     if (!branch || !branchCode) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide branch name and code'
//       });
//     }
    
//     const user = await User.findById(userId);
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }
    
//     user.branch = branch;
//     user.branchCode = branchCode;
//     user.lastLoginBranch = branch;
//     await user.save();
    
//     console.log('Branch selected successfully for user:', userId);
    
//     res.status(200).json({
//       success: true,
//       data: {
//         branch: user.branch,
//         branchCode: user.branchCode
//       },
//       message: 'Branch selected successfully'
//     });
//   } catch (error) {
//     console.error('Select branch error:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };
// ============ SELECT BRANCH (Admin) ============
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

// ✅ NEW: SELECT BRANCH (User)
const userSelectBranch = async (req, res) => {
  try {
    const { branch, branchCode } = req.body;
    const userId = req.user.id;
    
    console.log('User select branch for user:', userId, 'Branch:', branch);
    
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
    
    // Check if user is actually a user (not admin)
    if (user.role === 'admin' || user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admins should use admin branch selection'
      });
    }
    
    user.branch = branch;
    user.branchCode = branchCode;
    user.lastLoginBranch = branch;
    await user.save();
    
    console.log('User branch selected successfully for user:', userId);
    
    res.status(200).json({
      success: true,
      data: {
        branch: user.branch,
        branchCode: user.branchCode
      },
      message: 'Branch selected successfully'
    });
  } catch (error) {
    console.error('User select branch error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// ============ GET CURRENT USER ============
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

// ============ LOGOUT ============
const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get session ID from request
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    
    if (sessionId && user.sessions) {
      // Deactivate only this session
      user.sessions = user.sessions.map(s => {
        if (s.sessionId === sessionId) {
          return { ...s, isActive: false };
        }
        return s;
      });
      await user.save();
      
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully from this session',
        sessionId: sessionId
      });
    }
    
    // If no session ID, deactivate all sessions (complete logout)
    if (user.sessions) {
      user.sessions = user.sessions.map(s => ({ ...s, isActive: false }));
    }
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Logged out from all sessions'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ USER LOGIN ============
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'This is a user login. Please use admin login for admin accounts.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated.'
      });
    }

    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const sessionId = generateSessionId();
    
    if (!user.sessions) {
      user.sessions = [];
    }
    
    user.sessions.push({
      sessionId: sessionId,
      loginTime: new Date(),
      lastActivity: new Date(),
      isActive: true,
      role: 'user',
      deviceInfo: req.headers['user-agent'] || 'Unknown'
    });
    
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    await user.save();

    const token = generateToken(user._id, user.email, user.name, user.role);

    res.status(200).json({
      success: true,
      message: 'User login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || {},
        role: user.role,
        branch: user.branch || '',
        branchCode: user.branchCode || '',
        modules: user.modules || [],  // ✅ ADD THIS
        token: token,
        sessionId: sessionId,
        userType: 'user'
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ REGISTER USER ============
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      address: address || {},
      role: 'user',
      sessions: []
    });

    const token = generateToken(user._id, user.email, user.name, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        token: token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ GET USER PROFILE ============
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -__v');
    
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
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ UPDATE USER PROFILE ============
const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address, preferences } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) {
      user.address = { ...user.address, ...address };
    }
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        preferences: user.preferences,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ CHANGE PASSWORD ============
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordMatch = await user.matchPassword(currentPassword);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ UPLOAD PROFILE IMAGE ============
const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide image URL'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.profileImage = imageUrl;
    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ GET USER SESSIONS ============
const getUserSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const activeSessions = user.sessions?.filter(s => s.isActive) || [];
    
    res.status(200).json({
      success: true,
      data: {
        total: activeSessions.length,
        sessions: activeSessions.map(s => ({
          sessionId: s.sessionId,
          loginTime: s.loginTime,
          lastActivity: s.lastActivity,
          deviceInfo: s.deviceInfo,
          role: s.role,
          isCurrent: s.sessionId === (req.headers['x-session-id'])
        }))
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
const updateUserModules = async (req, res) => {
  try {
    const { modules } = req.body;
    const userId = req.params.id;

    // ✅ Validate modules
    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({
        success: false,
        message: 'Modules must be an array'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ Clean modules
    const cleanModules = modules.filter(Boolean);
    
    user.modules = cleanModules;
    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User modules updated successfully',
      data: {
        modules: user.modules
      }
    });
  } catch (error) {
    console.error('Update user modules error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user by admin
// @route   PUT /api/auth/users/:id
const updateUserByAdmin = async (req, res) => {
  try {
    const { name, email, phone, role, branch, branchCode } = req.body;
    const userId = req.params.id;

    // ✅ Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    user.name = name.trim();
    user.email = email.trim().toLowerCase();
    user.phone = phone?.trim() || user.phone || "";
    user.role = role || user.role || "user";
    user.branch = branch?.trim() || user.branch || "";
    user.branchCode = branchCode?.trim() || user.branchCode || "";

    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch: user.branch,
        branchCode: user.branchCode,
        modules: user.modules || []
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// ============ ADMIN: GET ALL USERS ============
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const total = await User.countDocuments(searchQuery);
    const users = await User.find(searchQuery)
      .select('-password -__v')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ ADMIN: GET USER BY ID ============
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');
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
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ ADMIN: DELETE USER ============
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ ADMIN: TOGGLE USER STATUS ============
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ ADMIN: GET DASHBOARD STATS ============
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    const adminCount = await User.countDocuments({ 
      role: { $in: ['admin', 'superadmin'] } 
    });
    const userCount = await User.countDocuments({ role: 'user' });

    const newUsersToday = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    const last7Days = await User.countDocuments({
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminCount,
        userCount,
        newUsersToday,
        last7Days
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ EXPORT ALL FUNCTIONS ============
module.exports = {
  // Admin functions
  loginUser,
  selectBranch,
  userSelectBranch,
  getCurrentUser,
  logoutUser,
  getUserSessions,
  
  // User functions
  registerUser,
  userLogin,
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadProfileImage,
  
  // Admin management
  getAllUsers,
  getUserById,
  deleteUser,
  toggleUserStatus,
  getDashboardStats,
  updateUserByAdmin,
  updateUserModules
};