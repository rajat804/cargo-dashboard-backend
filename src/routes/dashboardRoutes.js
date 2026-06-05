const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getBookingTrends,
  getBranchPerformance
} = require('../controllers/dashboardController');

router.get('/stats', getDashboardStats);
router.get('/trends', getBookingTrends);
router.get('/branches', getBranchPerformance);

module.exports = router;