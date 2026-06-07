const LocalManifest = require('../models/LocalManifest');

// @desc    Create new manifest
// @route   POST /api/local-manifests
const createManifest = async (req, res) => {
  try {
    const manifestData = req.body;
    
    console.log('Received manifest data:', JSON.stringify(manifestData, null, 2));
    
    // Validate required fields
    const requiredFields = ['branch', 'toStation', 'modeName', 'driverName', 'loadingPerson'];
    const missingFields = requiredFields.filter(field => !manifestData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Remove autoManifest flag as it's not needed in the model
    const autoManifest = manifestData.autoManifest;
    delete manifestData.autoManifest;
    
    // If autoManifest is true or manifestNo is not provided, let the model generate it
    if (autoManifest === true || !manifestData.manifestNo) {
      delete manifestData.manifestNo;
    }
    
    const manifest = new LocalManifest(manifestData);
    await manifest.save();
    
    res.status(201).json({
      success: true,
      data: manifest,
      message: 'Manifest created successfully'
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
// @route   GET /api/local-manifests
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
    if (branch && branch !== 'all') query.branch = { $regex: branch, $options: 'i' };
    if (manifestNo) query.manifestNo = { $regex: manifestNo, $options: 'i' };
    
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [manifests, total] = await Promise.all([
      LocalManifest.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      LocalManifest.countDocuments(query)
    ]);
    
    // Calculate totals for active manifests
    let totalPckgs = 0;
    let totalWeight = 0;
    
    if (status === 'active' || !status) {
      const activeManifests = await LocalManifest.find({ status: 'active' });
      totalPckgs = activeManifests.reduce((sum, m) => sum + (m.noOfPckgs || 0), 0);
      totalWeight = activeManifests.reduce((sum, m) => sum + (m.grossWeight || 0), 0);
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
// @route   GET /api/local-manifests/:id
const getManifestById = async (req, res) => {
  try {
    const manifest = await LocalManifest.findById(req.params.id);
    
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
// @route   GET /api/local-manifests/manifest/:manifestNo
const getManifestByNo = async (req, res) => {
  try {
    const manifest = await LocalManifest.findOne({ manifestNo: req.params.manifestNo });
    
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
// @route   PUT /api/local-manifests/:id
const updateManifest = async (req, res) => {
  try {
    const manifest = await LocalManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    // Don't allow updating manifest number
    delete req.body.manifestNo;
    delete req.body.autoManifest;
    
    const updatedManifest = await LocalManifest.findByIdAndUpdate(
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

// @desc    Update destination and related fields
// @route   PUT /api/local-manifests/:id/update-destination
const updateDestination = async (req, res) => {
  try {
    const { 
      newDestination, 
      newVehicleNo, 
      newDriver, 
      newVendor,
      newDriverMobile 
    } = req.body;
    
    const manifest = await LocalManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (newDestination) updateData.toStation = newDestination;
    if (newVehicleNo) updateData.vehicleNo = newVehicleNo;
    if (newDriver) updateData.driverName = newDriver;
    if (newVendor) updateData.vehicleVendor = newVendor;
    if (newDriverMobile) updateData.driverMobile = newDriverMobile;
    
    const updatedManifest = await LocalManifest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedManifest,
      message: 'Destination updated successfully'
    });
  } catch (error) {
    console.error('Update destination error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel manifest
// @route   PUT /api/local-manifests/:id/cancel
const cancelManifest = async (req, res) => {
  try {
    const { cancelledReason } = req.body;
    
    if (!cancelledReason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }
    
    const manifest = await LocalManifest.findById(req.params.id);
    
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
// @route   PUT /api/local-manifests/:id/restore
const restoreManifest = async (req, res) => {
  try {
    const manifest = await LocalManifest.findById(req.params.id);
    
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
// @route   DELETE /api/local-manifests/:id
const deleteManifest = async (req, res) => {
  try {
    const manifest = await LocalManifest.findById(req.params.id);
    
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
// @route   GET /api/local-manifests/stats
const getManifestStats = async (req, res) => {
  try {
    const [activeCount, cancelledCount, activePckgs, activeWeight] = await Promise.all([
      LocalManifest.countDocuments({ status: 'active' }),
      LocalManifest.countDocuments({ status: 'cancelled' }),
      LocalManifest.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$noOfPckgs' } } }
      ]),
      LocalManifest.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$grossWeight' } } }
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

module.exports = {
  createManifest,
  getManifests,
  getManifestById,
  getManifestByNo,
  updateManifest,
  updateDestination,
  cancelManifest,
  restoreManifest,
  deleteManifest,
  getManifestStats
};