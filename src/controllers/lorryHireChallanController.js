const LorryHireChallan = require('../models/LorryHireChallan');

// @desc    Create new Lorry Hire Challan
// @route   POST /api/lorry-hire-challans
const createLHC = async (req, res) => {
  try {
    const lhcData = req.body;
    
    console.log('Received LHC data:', JSON.stringify(lhcData, null, 2));
    
    const requiredFields = ['branchName', 'date'];
    const missingFields = requiredFields.filter(field => !lhcData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const autoLHC = lhcData.autoLHC;
    delete lhcData.autoLHC;
    
    if (autoLHC === true || !lhcData.lhcNo) {
      delete lhcData.lhcNo;
    }
    
    const lhc = new LorryHireChallan(lhcData);
    await lhc.save();
    
    res.status(201).json({
      success: true,
      data: lhc,
      message: 'Lorry Hire Challan created successfully'
    });
  } catch (error) {
    console.error('Create LHC error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all LHCs with filters
// @route   GET /api/lorry-hire-challans
const getLHCs = async (req, res) => {
  try {
    const {
      status,
      fromDate,
      toDate,
      branch,
      lhcNo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (branch && branch !== 'all') query.branchName = branch;
    if (lhcNo) query.lhcNo = { $regex: lhcNo, $options: 'i' };
    
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [lhcs, total] = await Promise.all([
      LorryHireChallan.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      LorryHireChallan.countDocuments(query)
    ]);
    
    // Calculate totals for active LHCs
    let totalFreight = 0;
    if (status === 'active' || !status) {
      const activeLHCs = await LorryHireChallan.find({ status: 'active' });
      totalFreight = activeLHCs.reduce((sum, l) => sum + (l.hireFreight || 0), 0);
    }
    
    res.status(200).json({
      success: true,
      data: lhcs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        totalFreight
      }
    });
  } catch (error) {
    console.error('Get LHCs error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single LHC by ID
// @route   GET /api/lorry-hire-challans/:id
const getLHCById = async (req, res) => {
  try {
    const lhc = await LorryHireChallan.findById(req.params.id);
    
    if (!lhc) {
      return res.status(404).json({
        success: false,
        message: 'Lorry Hire Challan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: lhc
    });
  } catch (error) {
    console.error('Get LHC by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get LHC by LHC number
// @route   GET /api/lorry-hire-challans/lhc/:lhcNo
const getLHCByNo = async (req, res) => {
  try {
    const lhc = await LorryHireChallan.findOne({ lhcNo: req.params.lhcNo });
    
    if (!lhc) {
      return res.status(404).json({
        success: false,
        message: 'Lorry Hire Challan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: lhc
    });
  } catch (error) {
    console.error('Get LHC by number error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update LHC
// @route   PUT /api/lorry-hire-challans/:id
const updateLHC = async (req, res) => {
  try {
    const lhc = await LorryHireChallan.findById(req.params.id);
    
    if (!lhc) {
      return res.status(404).json({
        success: false,
        message: 'Lorry Hire Challan not found'
      });
    }
    
    // Don't allow updating LHC number
    delete req.body.lhcNo;
    delete req.body.autoLHC;
    
    const updatedLHC = await LorryHireChallan.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedLHC,
      message: 'Lorry Hire Challan updated successfully'
    });
  } catch (error) {
    console.error('Update LHC error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel LHC
// @route   PUT /api/lorry-hire-challans/:id/cancel
const cancelLHC = async (req, res) => {
  try {
    const { cancelledReason } = req.body;
    
    if (!cancelledReason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }
    
    const lhc = await LorryHireChallan.findById(req.params.id);
    
    if (!lhc) {
      return res.status(404).json({
        success: false,
        message: 'Lorry Hire Challan not found'
      });
    }
    
    if (lhc.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'LHC is already cancelled'
      });
    }
    
    lhc.status = 'cancelled';
    lhc.cancelledReason = cancelledReason;
    lhc.updatedAt = new Date();
    await lhc.save();
    
    res.status(200).json({
      success: true,
      data: lhc,
      message: 'Lorry Hire Challan cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel LHC error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Restore cancelled LHC
// @route   PUT /api/lorry-hire-challans/:id/restore
const restoreLHC = async (req, res) => {
  try {
    const lhc = await LorryHireChallan.findById(req.params.id);
    
    if (!lhc) {
      return res.status(404).json({
        success: false,
        message: 'Lorry Hire Challan not found'
      });
    }
    
    if (lhc.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'LHC is already active'
      });
    }
    
    lhc.status = 'active';
    lhc.cancelledReason = undefined;
    lhc.updatedAt = new Date();
    await lhc.save();
    
    res.status(200).json({
      success: true,
      data: lhc,
      message: 'Lorry Hire Challan restored successfully'
    });
  } catch (error) {
    console.error('Restore LHC error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete LHC (permanent)
// @route   DELETE /api/lorry-hire-challans/:id
const deleteLHC = async (req, res) => {
  try {
    const lhc = await LorryHireChallan.findById(req.params.id);
    
    if (!lhc) {
      return res.status(404).json({
        success: false,
        message: 'Lorry Hire Challan not found'
      });
    }
    
    await lhc.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Lorry Hire Challan deleted permanently'
    });
  } catch (error) {
    console.error('Delete LHC error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get LHC statistics
// @route   GET /api/lorry-hire-challans/stats
const getLHCStats = async (req, res) => {
  try {
    const [activeCount, cancelledCount, activeFreight] = await Promise.all([
      LorryHireChallan.countDocuments({ status: 'active' }),
      LorryHireChallan.countDocuments({ status: 'cancelled' }),
      LorryHireChallan.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$hireFreight' } } }
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
          count: cancelledCount
        }
      }
    });
  } catch (error) {
    console.error('Get LHC stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pending manifests
// @route   GET /api/lorry-hire-challans/pending-manifests
const getPendingManifests = async (req, res) => {
  try {
    const { branch, toDate, modeType, despatchType, manifestForDays = 90 } = req.query;
    
    // This would typically fetch from your Manifest models
    // For now, returning sample data structure
    const samplePendingManifests = [
      { id: 1, manifestNo: "M001", manifestDate: new Date(), modeName: "DL01LA0837", destination: "MUMBAI", driverName: "Rajesh Kumar", driverTelNo: "9876543210", noOfGR: 5, noOfPckgs: 50, actualWeight: 2500, chargeWeight: 2600, selected: false },
      { id: 2, manifestNo: "M002", manifestDate: new Date(), modeName: "DL01LAD6175", destination: "BANGALORE", driverName: "Suresh Singh", driverTelNo: "9876543211", noOfGR: 8, noOfPckgs: 75, actualWeight: 3800, chargeWeight: 4000, selected: false },
      { id: 3, manifestNo: "M003", manifestDate: new Date(), modeName: "DL01LAJ4226", destination: "CHENNAI", driverName: "Mahesh Sharma", driverTelNo: "9876543212", noOfGR: 3, noOfPckgs: 30, actualWeight: 1500, chargeWeight: 1600, selected: false },
    ];
    
    res.status(200).json({
      success: true,
      data: samplePendingManifests,
      stats: {
        total: samplePendingManifests.length,
        totalPckgs: samplePendingManifests.reduce((sum, m) => sum + m.noOfPckgs, 0),
        totalWeight: samplePendingManifests.reduce((sum, m) => sum + m.chargeWeight, 0)
      }
    });
  } catch (error) {
    console.error('Get pending manifests error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createLHC,
  getLHCs,
  getLHCById,
  getLHCByNo,
  updateLHC,
  cancelLHC,
  restoreLHC,
  deleteLHC,
  getLHCStats,
  getPendingManifests
};