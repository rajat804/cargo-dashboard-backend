const Booking = require('../models/Booking');

// Helper function to generate GR number
const generateGRNo = async () => {
  // Get the last booking
  const lastBooking = await Booking.findOne().sort({ createdAt: -1 });

  let nextNumber = 1;
  if (lastBooking && lastBooking.grNo) {
    // Extract number from GR001 format
    const match = lastBooking.grNo.match(/GR(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  // Format as GR001, GR002, etc.
  return `GR${String(nextNumber).padStart(3, '0')}`;
};

// Create Booking
const createBooking = async (req, res) => {
  try {
    const bookingData = req.body;

    console.log("Received booking data:", {
      damageType: bookingData.damageType,
      damageReason: bookingData.damageReason,
      damagePackageCount: bookingData.damagePackageCount,
      damagePhotosCount: bookingData.damagePhotos?.length,
      voiceNoteUrl: bookingData.voiceNoteUrl ? "Present" : "Absent"
    });

    // ✅ Auto-generate GR number if not provided or empty
    let grNo = bookingData.grNo;
    if (!grNo || grNo.trim() === '') {
      grNo = await generateGRNo();
      console.log('Auto-generated GR No:', grNo);
    }

    // ✅ Check if GR number already exists
    const existingBooking = await Booking.findOne({ grNo });
    if (existingBooking) {
      // If exists, generate a new one
      grNo = await generateGRNo();
      console.log('GR No already exists, generated new:', grNo);
    }

    // ✅ Add GR number to booking data
    const finalBookingData = {
      ...bookingData,
      grNo,
      status: bookingData.status || 'active',
      bookingDate: bookingData.bookingDate || new Date(),
    };

    const booking = new Booking(finalBookingData);
    await booking.save();

    console.log("Booking saved:", {
      id: booking._id,
      grNo: booking.grNo,
      damagePackageCount: booking.damagePackageCount
    });

    res.status(201).json({
      success: true,
      data: booking,
      message: `Booking created successfully! GR No: ${grNo}`
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create booking'
    });
  }
};


// Get all bookings with filters
const getBookings = async (req, res) => {
  try {
    const {
      status,
      fromDate,
      toDate,
      grNo,
      branch,
      page = 1,
      limit = 50
    } = req.query;

    let query = {};

    if (status) query.status = status;
    if (grNo) query.grNo = { $regex: grNo, $options: 'i' };
    if (branch) query.bookingFrom = branch;

    if (fromDate || toDate) {
      query.bookingDate = {};
      if (fromDate) query.bookingDate.$gte = new Date(fromDate);
      if (toDate) query.bookingDate.$lte = new Date(toDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort({ createdAt: -1 })
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
      message: error.message || 'Failed to fetch bookings'
    });
  }
};

// Get booking by ID
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
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch booking'
    });
  }
};

// Get booking by GR No
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
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch booking'
    });
  }
};

// Update Booking
const updateBooking = async (req, res) => {
  try {
    const bookingData = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { ...bookingData, updatedAt: Date.now() },
      { new: true, runValidators: true }
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
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update booking'
    });
  }
};

// Cancel Booking
const cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancelledDate: Date.now(),
        cancelledReason: reason
      },
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
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel booking'
    });
  }
};

// Restore Booking
const restoreBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: 'active',
        cancelledDate: null,
        cancelledReason: null
      },
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
      message: 'Booking restored successfully'
    });
  } catch (error) {
    console.error('Restore booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore booking'
    });
  }
};

// Delete Booking (Permanent)
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Booking deleted permanently'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete booking'
    });
  }
};

// Get Booking Stats
const getBookingStats = async (req, res) => {
  try {
    const [activeStats, cancelledStats] = await Promise.all([
      Booking.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalFreight: { $sum: '$totalFreight' }
          }
        }
      ]),
      Booking.aggregate([
        { $match: { status: 'cancelled' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalFreight: { $sum: '$totalFreight' }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        active: {
          count: activeStats[0]?.count || 0,
          totalFreight: activeStats[0]?.totalFreight || 0
        },
        cancelled: {
          count: cancelledStats[0]?.count || 0,
          totalFreight: cancelledStats[0]?.totalFreight || 0
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stats'
    });
  }
};

// Update POD Entry
const updatePodEntry = async (req, res) => {
  try {
    const { podEntry, podUrl } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        podEntry,
        podUrl,
        podUploaded: true,
        podUploadedAt: Date.now()
      },
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
      message: 'POD updated successfully'
    });
  } catch (error) {
    console.error('Update POD error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update POD'
    });
  }
};

// Update Detention
const updateDetention = async (req, res) => {
  try {
    const { detentionDays, detentionAmount } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        detentionDays,
        detentionAmount
      },
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
      message: error.message || 'Failed to update detention'
    });
  }
};


const createStockIssueFromBooking = async (booking) => {
  for (const item of booking.goodsItems) {
    await StockIssue.create({
      issueId: `ISS${booking.grNo}`,
      issueTo: booking.bookingFrom,
      issueDate: format(booking.bookingDate, 'dd-MM-yyyy'),
      itemName: item.content || 'Goods',
      unitType: 'PCS',
      quantity: item.noOfPckgs || 1,
      remarks: `Created from Booking ${booking.grNo}`,
    });
  }
};

const createDespatchFromBooking = async (booking) => {
  await Dispatch.create({
    dispatchId: `DISP${booking.grNo}`,
    dispatchDate: format(booking.bookingDate, 'dd-MM-yyyy'),
    branchName: booking.bookingFrom,
    dispatchedTo: booking.destination,
    vendorGrNo: booking.grNo,
    items: booking.goodsItems.map(item => ({
      itemName: item.content,
      unitType: 'PCS',
      qty: item.noOfPckgs || 1,
    })),
    remarks: `Created from Booking ${booking.grNo}`,
  });
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
  updateDetention,
  createStockIssueFromBooking,
  createDespatchFromBooking
};