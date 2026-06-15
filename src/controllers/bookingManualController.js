const BookingManual = require('../models/BookingManual');

// Helper function to calculate freight
const calculateFreight = (data) => {
  const manualRates = data.manualRates || false;
  const freightOn = data.freightOn || 'CHARGE WEIGHT';
  const freightRate = data.freightRate || 0;
  const totalChargeWeight = data.totalChargeWeight || 0;
  const totalActualWeight = data.totalActualWeight || 0;
  const totalPckgs = data.totalPckgs || 0;
  
  let freight = 0;
  
  if (manualRates && freightRate > 0) {
    if (freightOn === 'CHARGE WEIGHT') {
      freight = totalChargeWeight * freightRate;
    } else if (freightOn === 'ACTUAL WEIGHT') {
      freight = totalActualWeight * freightRate;
    } else if (freightOn === 'PER PACKAGE') {
      freight = totalPckgs * freightRate;
    }
  } else {
    // Default: ₹5 per kg on charge weight
    freight = totalChargeWeight * 5;
  }
  
  return Math.round(freight * 100) / 100;
};

// Helper function to calculate totals
const calculateTotals = (data) => {
  const freight = calculateFreight(data);
  const extraChargesTotal = (data.extraCharges || []).reduce((sum, charge) => sum + (charge.amount || 0), 0);
  const subTotal = freight + extraChargesTotal;
  const gstAmount = (subTotal * (data.gstRate || 0)) / 100;
  const totalAmount = subTotal + gstAmount;
  const balanceAmount = totalAmount - (data.advanceAmount || 0);
  
  return {
    totalFreight: freight,
    subTotal: Math.round(subTotal * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    balanceAmount: balanceAmount > 0 ? Math.round(balanceAmount * 100) / 100 : 0
  };
};

// @desc    Create new manual booking
// @route   POST /api/bookings-manual
const createBooking = async (req, res) => {
  try {
    const bookingData = req.body;
    
    console.log('=== CREATE BOOKING ===');
    console.log('GR No:', bookingData.grNo);
    console.log('Total Charge Weight:', bookingData.totalChargeWeight);
    
    // Validate required fields
    const requiredFields = ['bookingFrom', 'destination', 'consignorName', 'consigneeName', 'bookingType', 'collectionAt', 'serviceProduct', 'deliveryType', 'loadType', 'grNo'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Check if GR number already exists
    const existingBooking = await BookingManual.findOne({ grNo: bookingData.grNo });
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: `GR number ${bookingData.grNo} already exists. Please use a unique GR number.`
      });
    }
    
    // Calculate freight and totals
    const calculated = calculateTotals(bookingData);
    bookingData.totalFreight = calculated.totalFreight;
    bookingData.subTotal = calculated.subTotal;
    bookingData.gstAmount = calculated.gstAmount;
    bookingData.totalAmount = calculated.totalAmount;
    bookingData.balanceAmount = calculated.balanceAmount;
    
    console.log('Calculated Freight:', bookingData.totalFreight);
    console.log('Calculated Total:', bookingData.totalAmount);
    
    // Add user information
    if (req.user) {
      bookingData.createdBy = req.user._id || req.user.id;
      bookingData.userName = req.user.name || '';
      bookingData.createdByBranch = bookingData.bookingFrom;
    }
    
    const booking = new BookingManual(bookingData);
    await booking.save();
    
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Manual booking created successfully'
    });
  } catch (error) {
    console.error('Create manual booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all manual bookings with filters
const getBookings = async (req, res) => {
  try {
    const {
      status,
      fromDate,
      toDate,
      grNo,
      branch,
      consignorName,
      consigneeName,
      page = 1,
      limit = 100,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    
    if (grNo && grNo.trim() !== '') {
      query.grNo = { $regex: grNo.trim(), $options: 'i' };
    }
    
    if (branch && branch !== 'all') query.bookingFrom = branch;
    if (consignorName) query.consignorName = { $regex: consignorName, $options: 'i' };
    if (consigneeName) query.consigneeName = { $regex: consigneeName, $options: 'i' };
    
    if (fromDate || toDate) {
      query.bookingDate = {};
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        query.bookingDate.$gte = startDate;
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.bookingDate.$lte = endDate;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [bookings, total] = await Promise.all([
      BookingManual.find(query).sort(sortOptions).skip(skip).limit(parseInt(limit)),
      BookingManual.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get manual bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single manual booking by ID
const getBookingById = async (req, res) => {
  try {
    const booking = await BookingManual.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Manual booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get manual booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get manual booking by GR number
const getBookingByGrNo = async (req, res) => {
  try {
    const booking = await BookingManual.findOne({ grNo: req.params.grNo });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Manual booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get manual booking by GR No error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update manual booking
const updateBooking = async (req, res) => {
  try {
    const booking = await BookingManual.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Manual booking not found'
      });
    }
    
    const updateData = { ...req.body, updatedAt: new Date() };
    
    // Recalculate freight and totals
    const mergedData = { ...booking.toObject(), ...updateData };
    const calculated = calculateTotals(mergedData);
    updateData.totalFreight = calculated.totalFreight;
    updateData.subTotal = calculated.subTotal;
    updateData.gstAmount = calculated.gstAmount;
    updateData.totalAmount = calculated.totalAmount;
    updateData.balanceAmount = calculated.balanceAmount;
    
    // Don't allow updating GR number
    delete updateData.grNo;
    
    const updatedBooking = await BookingManual.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedBooking,
      message: 'Manual booking updated successfully'
    });
  } catch (error) {
    console.error('Update manual booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel manual booking
const cancelBooking = async (req, res) => {
  try {
    const { cancelledReason } = req.body;
    
    if (!cancelledReason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }
    
    const booking = await BookingManual.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Manual booking not found'
      });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }
    
    booking.status = 'cancelled';
    booking.cancelledDate = new Date();
    booking.cancelledReason = cancelledReason;
    await booking.save();
    
    res.status(200).json({
      success: true,
      data: booking,
      message: 'Manual booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel manual booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Restore cancelled manual booking
const restoreBooking = async (req, res) => {
  try {
    const booking = await BookingManual.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Manual booking not found'
      });
    }
    
    if (booking.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already active'
      });
    }
    
    booking.status = 'active';
    booking.cancelledDate = undefined;
    booking.cancelledReason = undefined;
    await booking.save();
    
    res.status(200).json({
      success: true,
      data: booking,
      message: 'Manual booking restored successfully'
    });
  } catch (error) {
    console.error('Restore manual booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete manual booking (permanent)
const deleteBooking = async (req, res) => {
  try {
    const booking = await BookingManual.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Manual booking not found'
      });
    }
    
    await booking.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Manual booking deleted permanently'
    });
  } catch (error) {
    console.error('Delete manual booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get manual booking statistics
const getBookingStats = async (req, res) => {
  try {
    const [activeCount, cancelledCount, activeFreight, cancelledFreight] = await Promise.all([
      BookingManual.countDocuments({ status: 'active' }),
      BookingManual.countDocuments({ status: 'cancelled' }),
      BookingManual.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$totalFreight' } } }
      ]),
      BookingManual.aggregate([
        { $match: { status: 'cancelled' } },
        { $group: { _id: null, total: { $sum: '$totalFreight' } } }
      ])
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        active: {
          count: activeCount,
          totalFreight: activeFreight[0]?.total || 0
        },
        cancelled: {
          count: cancelledCount,
          totalFreight: cancelledFreight[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Get manual booking stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  getBookingByGrNo,
  updateBooking,
  cancelBooking,
  restoreBooking,
  deleteBooking,
  getBookingStats
};