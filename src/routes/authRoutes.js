const express = require('express');
const router = express.Router();
const {
  loginUser,
  selectBranch,
  getCurrentUser,
  logoutUser
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/login', loginUser);

// Protected routes
router.post('/select-branch', protect, selectBranch);
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logoutUser);

module.exports = router;