const Booking = require('../models/Booking');
const Client = require('../models/Client');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Public
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const [
      totalBookings,
      activeBookings,
      cancelledBookings,
      todayBookings,
      monthBookings,
      weekBookings,
      totalFreight,
      monthFreight,
      weekFreight,
      totalClients
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'active' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.countDocuments({ bookingDate: { $gte: today, $lt: tomorrow } }),
      Booking.countDocuments({ bookingDate: { $gte: startOfMonth } }),
      Booking.countDocuments({ bookingDate: { $gte: startOfWeek } }),
      Booking.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$totalFreight' } } }
      ]),
      Booking.aggregate([
        { $match: { status: 'active', bookingDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalFreight' } } }
      ]),
      Booking.aggregate([
        { $match: { status: 'active', bookingDate: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$totalFreight' } } }
      ]),
      Client.countDocuments()
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        bookings: {
          total: totalBookings,
          active: activeBookings,
          cancelled: cancelledBookings,
          today: todayBookings,
          thisMonth: monthBookings,
          thisWeek: weekBookings
        },
        freight: {
          total: totalFreight[0]?.total || 0,
          thisMonth: monthFreight[0]?.total || 0,
          thisWeek: weekFreight[0]?.total || 0
        },
        clients: {
          total: totalClients
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get monthly booking trends
// @route   GET /api/dashboard/trends
// @access  Public
const getBookingTrends = async (req, res) => {
  try {
    const { year = new Date().getFullYear(), months = 6 } = req.query;
    
    const trends = await Booking.aggregate([
      {
        $match: {
          bookingDate: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$bookingDate' }, status: '$status' },
          count: { $sum: 1 },
          freight: { $sum: '$totalFreight' }
        }
      },
      {
        $group: {
          _id: '$_id.month',
          active: {
            $push: {
              $cond: [{ $eq: ['$_id.status', 'active'] }, {
                count: '$count',
                freight: '$freight'
              }, null]
            }
          },
          cancelled: {
            $push: {
              $cond: [{ $eq: ['$_id.status', 'cancelled'] }, {
                count: '$count',
                freight: '$freight'
              }, null]
            }
          }
        }
      },
      {
        $project: {
          month: '$_id',
          active: { $arrayElemAt: ['$active', 0] },
          cancelled: { $arrayElemAt: ['$cancelled', 0] }
        }
      },
      { $sort: { month: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Get booking trends error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get branch performance
// @route   GET /api/dashboard/branches
// @access  Public
const getBranchPerformance = async (req, res) => {
  try {
    const branches = await Booking.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$bookingFrom',
          count: { $sum: 1 },
          totalFreight: { $sum: '$totalFreight' },
          totalWeight: { $sum: '$totalChargeWeight' }
        }
      },
      {
        $project: {
          branch: '$_id',
          count: 1,
          totalFreight: 1,
          totalWeight: 1,
          averageFreight: { $divide: ['$totalFreight', '$count'] }
        }
      },
      { $sort: { totalFreight: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Get branch performance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getBookingTrends,
  getBranchPerformance
};