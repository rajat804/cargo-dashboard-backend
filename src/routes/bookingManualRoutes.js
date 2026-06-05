const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  getBookingById,
  getBookingByGrNo,
  updateBooking,
  cancelBooking,
  restoreBooking,
  deleteBooking,
  getBookingStats
} = require('../controllers/bookingManualController');

router.route('/')
  .post(createBooking)
  .get(getBookings);

router.get('/stats', getBookingStats);
router.get('/grn/:grNo', getBookingByGrNo);

router.route('/:id')
  .get(getBookingById)
  .put(updateBooking)
  .delete(deleteBooking);

router.put('/:id/cancel', cancelBooking);
router.put('/:id/restore', restoreBooking);

module.exports = router;