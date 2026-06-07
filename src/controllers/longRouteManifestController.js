const LongRouteManifest = require('../models/LongRouteManifest');

// @desc    Create new long route manifest
// @route   POST /api/long-route-manifests
const createManifest = async (req, res) => {
  try {
    const manifestData = req.body;
    
    console.log('Received long route manifest data:', JSON.stringify(manifestData, null, 2));
    
    // Validate required fields
    const requiredFields = ['branch', 'toStation', 'vehicleNo', 'driver', 'loadedBy'];
    const missingFields = requiredFields.filter(field => !manifestData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Set derived fields
    manifestData.type = 'LONG ROUTE';
    manifestData.fromStation = manifestData.branch;
    manifestData.arrivalAt = manifestData.toStation;
    manifestData.category = manifestData.vehicleType;
    manifestData.dispatchedPckgs = 0;
    manifestData.dispatchedWt = 0;
    
    // Remove autoManifest flag as it's not needed in the model
    const autoManifest = manifestData.autoManifest;
    delete manifestData.autoManifest;
    
    // If autoManifest is true or manifestNo is not provided, let the model generate it
    if (autoManifest === true || !manifestData.manifestNo) {
      delete manifestData.manifestNo;
    }
    
    const manifest = new LongRouteManifest(manifestData);
    await manifest.save();
    
    res.status(201).json({
      success: true,
      data: manifest,
      message: 'Long route manifest created successfully'
    });
  } catch (error) {
    console.error('Create manifest error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all manifests with filters
// @route   GET /api/long-route-manifests
const getManifests = async (req, res) => {
  try {
    const {
      status,
      fromDate,
      toDate,
      branch,
      manifestNo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (branch) query.branch = { $regex: branch, $options: 'i' };
    if (manifestNo) query.manifestNo = { $regex: manifestNo, $options: 'i' };
    
    if (fromDate || toDate) {
      query.manifestDateTime = {};
      if (fromDate) query.manifestDateTime.$gte = new Date(fromDate);
      if (toDate) query.manifestDateTime.$lte = new Date(toDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [manifests, total] = await Promise.all([
      LongRouteManifest.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      LongRouteManifest.countDocuments(query)
    ]);
    
    // Calculate totals for active manifests
    let totalPckgs = 0;
    let totalWeight = 0;
    
    if (status === 'active' || !status) {
      const activeManifests = await LongRouteManifest.find({ status: 'active' });
      totalPckgs = activeManifests.reduce((sum, m) => sum + (m.dispatchedPckgs || 0), 0);
      totalWeight = activeManifests.reduce((sum, m) => sum + (m.dispatchedWt || 0), 0);
    }
    
    res.status(200).json({
      success: true,
      data: manifests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        totalPckgs,
        totalWeight
      }
    });
  } catch (error) {
    console.error('Get manifests error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single manifest by ID
// @route   GET /api/long-route-manifests/:id
const getManifestById = async (req, res) => {
  try {
    const manifest = await LongRouteManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: manifest
    });
  } catch (error) {
    console.error('Get manifest by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get manifest by manifest number
// @route   GET /api/long-route-manifests/manifest/:manifestNo
const getManifestByNo = async (req, res) => {
  try {
    const manifest = await LongRouteManifest.findOne({ manifestNo: req.params.manifestNo });
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: manifest
    });
  } catch (error) {
    console.error('Get manifest by number error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update manifest
// @route   PUT /api/long-route-manifests/:id
const updateManifest = async (req, res) => {
  try {
    const manifest = await LongRouteManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    // Don't allow updating manifest number
    delete req.body.manifestNo;
    delete req.body.autoManifest;
    delete req.body.type;
    
    // Update derived fields
    if (req.body.branch) req.body.fromStation = req.body.branch;
    if (req.body.toStation) req.body.arrivalAt = req.body.toStation;
    if (req.body.vehicleType) req.body.category = req.body.vehicleType;
    
    const updatedManifest = await LongRouteManifest.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedManifest,
      message: 'Manifest updated successfully'
    });
  } catch (error) {
    console.error('Update manifest error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update dispatched packages and weight
// @route   PUT /api/long-route-manifests/:id/dispatch
const updateDispatchDetails = async (req, res) => {
  try {
    const { dispatchedPckgs, dispatchedWt } = req.body;
    
    const manifest = await LongRouteManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    manifest.dispatchedPckgs = dispatchedPckgs || 0;
    manifest.dispatchedWt = dispatchedWt || 0;
    manifest.updatedAt = new Date();
    await manifest.save();
    
    res.status(200).json({
      success: true,
      data: manifest,
      message: 'Dispatch details updated successfully'
    });
  } catch (error) {
    console.error('Update dispatch details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel manifest
// @route   PUT /api/long-route-manifests/:id/cancel
const cancelManifest = async (req, res) => {
  try {
    const { cancelledReason } = req.body;
    
    if (!cancelledReason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }
    
    const manifest = await LongRouteManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    if (manifest.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Manifest is already cancelled'
      });
    }
    
    manifest.status = 'cancelled';
    manifest.cancelledReason = cancelledReason;
    manifest.updatedAt = new Date();
    await manifest.save();
    
    res.status(200).json({
      success: true,
      data: manifest,
      message: 'Manifest cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel manifest error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Restore cancelled manifest
// @route   PUT /api/long-route-manifests/:id/restore
const restoreManifest = async (req, res) => {
  try {
    const manifest = await LongRouteManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    if (manifest.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Manifest is already active'
      });
    }
    
    manifest.status = 'active';
    manifest.cancelledReason = undefined;
    manifest.updatedAt = new Date();
    await manifest.save();
    
    res.status(200).json({
      success: true,
      data: manifest,
      message: 'Manifest restored successfully'
    });
  } catch (error) {
    console.error('Restore manifest error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete manifest (permanent)
// @route   DELETE /api/long-route-manifests/:id
const deleteManifest = async (req, res) => {
  try {
    const manifest = await LongRouteManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    await manifest.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Manifest deleted permanently'
    });
  } catch (error) {
    console.error('Delete manifest error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get manifest statistics
// @route   GET /api/long-route-manifests/stats
const getManifestStats = async (req, res) => {
  try {
    const [activeCount, cancelledCount, activePckgs, activeWeight] = await Promise.all([
      LongRouteManifest.countDocuments({ status: 'active' }),
      LongRouteManifest.countDocuments({ status: 'cancelled' }),
      LongRouteManifest.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$dispatchedPckgs' } } }
      ]),
      LongRouteManifest.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$dispatchedWt' } } }
      ])
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        active: {
          count: activeCount,
          totalPckgs: activePckgs[0]?.total || 0,
          totalWeight: activeWeight[0]?.total || 0
        },
        cancelled: {
          count: cancelledCount
        }
      }
    });
  } catch (error) {
    console.error('Get manifest stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== STOCK APIs (For Stock of Despatch) ====================

// @desc    Get stock items (GRs available for dispatch)
// @route   GET /api/long-route-manifests/stock
const getStockItems = async (req, res) => {
  try {
    const { branch, destination, asOnDate } = req.query;
    
    // This would typically fetch from Booking model
    // For now, returning sample data structure
    // In production, you would query the Bookings model
    
    const query = { status: 'active' };
    if (branch && branch !== 'ALL') query.bookingFrom = branch;
    if (destination && destination !== 'ALL') query.destination = destination;
    if (asOnDate) {
      const date = new Date(asOnDate);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query.bookingDate = { $gte: date, $lt: nextDay };
    }
    
    // This is a sample response - in production, replace with actual Booking model query
    const sampleStockItems = [
      { id: 1, grNo: "GR001", grDate: new Date(), origin: "DELHI", destination: "MUMBAI", consignor: "M/s ABC Traders", consignee: "M/s XYZ Enterprises", toPay: "Yes", paid: "No", tbb: "TBB001", stockPckgs: 50, selected: false },
      { id: 2, grNo: "GR002", grDate: new Date(), origin: "DELHI", destination: "BANGALORE", consignor: "M/s PQR Ltd", consignee: "M/s LMN Corp", toPay: "No", paid: "Yes", tbb: "TBB002", stockPckgs: 30, selected: false },
      { id: 3, grNo: "GR003", grDate: new Date(), origin: "MUMBAI", destination: "CHENNAI", consignor: "M/s DEF Industries", consignee: "M/s GHI Enterprises", toPay: "Yes", paid: "No", tbb: "TBB003", stockPckgs: 25, selected: false },
      { id: 4, grNo: "GR004", grDate: new Date(), origin: "BANGALORE", destination: "DELHI", consignor: "M/s JKL Solutions", consignee: "M/s MNO Corp", toPay: "No", paid: "Yes", tbb: "TBB004", stockPckgs: 40, selected: false },
      { id: 5, grNo: "GR005", grDate: new Date(), origin: "CHENNAI", destination: "KOLKATA", consignor: "M/s RST Group", consignee: "M/s UVW Enterprises", toPay: "Yes", paid: "No", tbb: "TBB005", stockPckgs: 35, selected: false },
    ];
    
    // Filter based on query parameters
    let filteredItems = [...sampleStockItems];
    if (branch && branch !== 'ALL') {
      filteredItems = filteredItems.filter(item => item.origin === branch);
    }
    if (destination && destination !== 'ALL') {
      filteredItems = filteredItems.filter(item => item.destination === destination);
    }
    
    res.status(200).json({
      success: true,
      data: filteredItems,
      stats: {
        total: filteredItems.length,
        totalPckgs: filteredItems.reduce((sum, item) => sum + item.stockPckgs, 0)
      }
    });
  } catch (error) {
    console.error('Get stock items error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createManifest,
  getManifests,
  getManifestById,
  getManifestByNo,
  updateManifest,
  updateDispatchDetails,
  cancelManifest,
  restoreManifest,
  deleteManifest,
  getManifestStats,
  getStockItems
};