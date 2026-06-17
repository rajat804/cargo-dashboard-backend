// ============================================
// src/routes/goodsArrivalRoutes.js
// ============================================
const express = require('express');
const router = express.Router();
const {
  createGoodsArrival,
  getGoodsArrivals,
  getPendingArrivals,
  getGoodsArrivalById,
  updateGoodsArrival,
  deleteGoodsArrival,
  cancelGoodsArrival,
  restoreGoodsArrival,
  printGoodsArrival,
  exportGoodsArrivals,
  getGoodsArrivalStats,
  // searchManifest,
  searchManifestByGR
} = require('../controllers/goodsArrivalController');

// ============================================
// PUBLIC ROUTES (within authenticated context)
// ============================================

// Stats route - must be before /:id
router.get('/stats', getGoodsArrivalStats);

// Pending arrivals route - must be before /:id
router.get('/pending', getPendingArrivals);

// Export route - must be before /:id
router.get('/export', exportGoodsArrivals);



// Main CRUD routes
router.route('/')
  .get(getGoodsArrivals)
  .post(createGoodsArrival);


// Search manifest by any field (number, ID, etc.)
router.get('/search-by-gr', searchManifestByGR);

// Routes with ID parameter
router.route('/:id')
  .get(getGoodsArrivalById)
  .put(updateGoodsArrival)
  .delete(deleteGoodsArrival);

// Cancel and restore routes
router.patch('/:id/cancel', cancelGoodsArrival);
router.patch('/:id/restore', restoreGoodsArrival);

// Print route
router.get('/:id/print', printGoodsArrival);

module.exports = router;