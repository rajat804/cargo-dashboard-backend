const BookingManual = require('../models/BookingManual');

// @desc    Create new manual booking
// @route   POST /api/bookings-manual
const createBooking = async (req, res) => {
  try {
    const bookingData = req.body;
    
    console.log('Received manual booking data:', JSON.stringify(bookingData, null, 2));
    
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
    
    // Add user information from request (if available)
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
// @route   GET /api/bookings-manual
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
    
    console.log('=== MANUAL BOOKINGS SEARCH ===');
    console.log('Search params:', { status, fromDate, toDate, grNo, branch });
    
    const query = {};
    
    if (status) query.status = status;
    
    // FIX: Better GR No search - handles both numeric and alphanumeric
    if (grNo && grNo.trim() !== '') {
      const searchTerm = grNo.trim();
      // Use regex for partial matching, case-insensitive
      query.grNo = { $regex: searchTerm, $options: 'i' };
      console.log('GR No filter (regex):', query.grNo);
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
    
    console.log('MongoDB Query:', JSON.stringify(query, null, 2));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [bookings, total] = await Promise.all([
      BookingManual.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      BookingManual.countDocuments(query)
    ]);
    
    console.log(`Found ${bookings.length} manual bookings`);
    if (bookings.length > 0) {
      console.log('GR Numbers found:', bookings.map(b => b.grNo));
    } else {
      console.log('No bookings found for this search');
      // Debug: Show all GR numbers in the database
      const allBookings = await BookingManual.find({ status: 'active' }).limit(10);
      console.log('Sample GR numbers in DB:', allBookings.map(b => b.grNo));
    }
    
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
    
    // Don't allow updating GR number
    delete req.body.grNo;
    delete req.body.autoLHC;
    
    const updatedBooking = await BookingManual.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
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