// routes/goodsArrivalRoutes.js
const express = require('express');
const router = express.Router();
const {
  createGoodsArrival,
  getGoodsArrivals,
  getPendingArrivals,
  getGoodsArrivalById,
  updateGoodsArrival,
  deleteGoodsArrival,
  printGoodsArrival,
  exportGoodsArrivals
} = require('../controllers/goodsArrivalController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Public routes (within authenticated context)
router.route('/')
  .get(getGoodsArrivals)
  .post(createGoodsArrival);

// Pending arrivals endpoint - must be before /:id
router.get('/pending', getPendingArrivals);
router.get('/export', exportGoodsArrivals);

// Routes with ID parameter
router.route('/:id')
  .get(getGoodsArrivalById)
  .put(updateGoodsArrival)
  .delete(deleteGoodsArrival);

router.get('/:id/print', printGoodsArrival);

module.exports = router;