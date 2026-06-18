const express = require('express');
const router = express.Router();
const {
  // Admin functions
  loginUser,
  selectBranch,        // Admin branch selection
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
  
  // NEW: User branch selection
  userSelectBranch,    // ✅ Add this
  
  // Admin management
  getAllUsers,
  getUserById,
  deleteUser,
  toggleUserStatus,
  getDashboardStats,
  updateUserByAdmin,
  updateUserModules
} = require('../controllers/authController');
const { protect, admin, authorize, checkSession } = require('../middleware/auth');

// ============ PUBLIC ROUTES ============
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/user-login', userLogin);
router.get('/check-session', checkSession);

// ============ PROTECTED ROUTES ============
router.use(protect);

// Session management
router.get('/sessions', getUserSessions);
router.post('/logout', logoutUser);

// Admin branch selection (admin only)
router.post('/select-branch', admin, selectBranch);

// ✅ NEW: User branch selection (user only)
router.post('/user-select-branch', userSelectBranch);

// User profile
router.get('/me', getCurrentUser);
router.route('/profile')
  .get(getUserProfile)
  .put(updateUserProfile);
router.put('/change-password', changePassword);
router.post('/upload-image', uploadProfileImage);

// ============ ADMIN ONLY ROUTES ============
router.use(authorize('admin', 'superadmin'));
router.put('/users/:id', protect, authorize('admin', 'superadmin'), updateUserByAdmin);
router.put('/users/:id/modules', protect, authorize('admin', 'superadmin'), updateUserModules)
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.get('/dashboard-stats', getDashboardStats);

module.exports = router;