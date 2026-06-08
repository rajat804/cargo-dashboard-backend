const Booking = require('../models/Booking');
const Client = require('../models/Client');

const createBooking = async (req, res) => {
  try {
    const bookingData = req.body;
    
    console.log('Received booking data:', JSON.stringify(bookingData, null, 2));
    
    // Validate required fields
    if (!bookingData.bookingFrom || !bookingData.destination || 
        !bookingData.consignorName || !bookingData.consigneeName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: bookingFrom, destination, consignorName, consigneeName'
      });
    }
    
    // Add user information from request (if available)
    if (req.user) {
      bookingData.createdBy = req.user._id || req.user.id;
      bookingData.userName = req.user.name || '';
      bookingData.createdByBranch = bookingData.bookingFrom;
    }
    
    // Remove grNo from request body if it exists (let the model generate it)
    delete bookingData.grNo;
    
    const booking = new Booking(bookingData);
    
    // Manually generate GR number if pre-save middleware is not working
    const count = await Booking.countDocuments();
    booking.grNo = `GR${String(count + 1).padStart(6, '0')}`;
    console.log('Generated GR No:', booking.grNo);
    
    await booking.save();
    
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all bookings with filters
// @route   GET /api/bookings
// @access  Public
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
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (grNo) query.grNo = { $regex: grNo, $options: 'i' };
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
      Booking.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query)
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
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Public
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get booking by GR number
// @route   GET /api/bookings/grn/:grNo
// @access  Public
const getBookingByGrNo = async (req, res) => {
  try {
    const booking = await Booking.findOne({ grNo: req.params.grNo });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking by GR No error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Public
const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Public
const cancelBooking = async (req, res) => {
  try {
    const { cancelledReason } = req.body;
    
    if (!cancelledReason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
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
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Restore cancelled booking
// @route   PUT /api/bookings/:id/restore
// @access  Public
const restoreBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
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
      message: 'Booking restored successfully'
    });
  } catch (error) {
    console.error('Restore booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete booking (permanent)
// @route   DELETE /api/bookings/:id
// @access  Public
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    await booking.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Booking deleted permanently'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Public
const getBookingStats = async (req, res) => {
  try {
    const [activeCount, cancelledCount, activeFreight, cancelledFreight] = await Promise.all([
      Booking.countDocuments({ status: 'active' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$totalFreight' } } }
      ]),
      Booking.aggregate([
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
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update POD entry
// @route   PUT /api/bookings/:id/pod
// @access  Public
const updatePodEntry = async (req, res) => {
  try {
    const { podEntry } = req.body;
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { podEntry, updatedAt: new Date() },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking,
      message: 'POD entry updated successfully'
    });
  } catch (error) {
    console.error('Update POD entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update detention
// @route   PUT /api/bookings/:id/detention
// @access  Public
const updateDetention = async (req, res) => {
  try {
    const { detentionDays, detentionAmount } = req.body;
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { detentionDays, detentionAmount, updatedAt: new Date() },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking,
      message: 'Detention updated successfully'
    });
  } catch (error) {
    console.error('Update detention error:', error);
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
  getBookingStats,
  updatePodEntry,
  updateDetention
};