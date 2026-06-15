const LocalManifest = require('../models/LocalManifest');
const Booking = require('../models/Booking');
const BookingManual = require('../models/BookingManual');
const mongoose = require('mongoose');
const { Types: { ObjectId } } = mongoose;

// Helper function to calculate totals
const calculateManifestTotals = (assignedGRs) => {
  const totalPckgs = assignedGRs.reduce((sum, gr) => sum + (gr.dispatchedPckgs || 0), 0);
  const totalWeight = assignedGRs.reduce((sum, gr) => sum + (gr.weight || 0), 0);
  return { totalPckgs, totalWeight };
};

// @desc    Create new manifest
// @route   POST /api/local-manifests
const createManifest = async (req, res) => {
  try {
    const manifestData = req.body;
    
    console.log('Received manifest data:', JSON.stringify(manifestData, null, 2));
    
    const requiredFields = ['branch', 'toStation', 'modeName', 'driverName', 'loadingPerson'];
    const missingFields = requiredFields.filter(field => !manifestData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const autoManifest = manifestData.autoManifest;
    delete manifestData.autoManifest;
    
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
      modeName,
      driverName,
      vehicleVendor,
      vendorCDNo,
      remarks,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (branch && branch !== 'all') query.branch = { $regex: branch, $options: 'i' };
    if (manifestNo) query.manifestNo = { $regex: manifestNo, $options: 'i' };
    if (modeName) query.modeName = { $regex: modeName, $options: 'i' };
    if (driverName) query.driverName = { $regex: driverName, $options: 'i' };
    if (vehicleVendor) query.vehicleVendor = { $regex: vehicleVendor, $options: 'i' };
    if (vendorCDNo) query.vendorCDNo = { $regex: vendorCDNo, $options: 'i' };
    if (remarks) query.remarks = { $regex: remarks, $options: 'i' };
    
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        query.date.$gte = startDate;
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
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
    
    res.status(200).json({
      success: true,
      data: manifests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
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

// @desc    Update manifest (basic info)
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
    const { newDestination, newVehicleNo, newDriver, newVendor, newDriverMobile } = req.body;
    
    const manifest = await LocalManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    const updateData = { updatedAt: new Date() };
    
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

// @desc    Update dispatch details (assigned GRs) - SINGLE FUNCTION ONLY
// @route   PUT /api/local-manifests/:id/dispatch
const updateDispatchDetails = async (req, res) => {
  try {
    const { dispatchedPckgs, dispatchedWt, assignedGRs } = req.body;
    
    console.log('=== UPDATE DISPATCH DETAILS ===');
    console.log('Manifest ID:', req.params.id);
    console.log('assignedGRs count:', assignedGRs?.length);
    
    const manifest = await LocalManifest.findById(req.params.id);
    
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }
    
    const updateData = { updatedAt: new Date() };
    
    if (assignedGRs !== undefined) {
      const formattedAssignedGRs = assignedGRs.map(gr => {
        const bookingIdValue = gr.bookingId || gr.id;
        const maxPackages = gr.bookedPckgs || gr.stockPckgs || 0;
        const dispatchedPckgsValue = gr.dispatchedPckgs || 0;
        
        if (dispatchedPckgsValue > maxPackages) {
          throw new Error(`Cannot dispatch more than ${maxPackages} packages for GR ${gr.grNo}`);
        }
        
        return {
          id: bookingIdValue,
          grNo: gr.grNo,
          grDate: gr.grDate,
          consignor: gr.consignor,
          consignee: gr.consignee,
          destination: gr.destination,
          toPay: gr.toPay || 0,
          paid: gr.paid || 0,
          tbb: gr.tbb || 0,
          bookedPckgs: gr.bookedPckgs || 0,
          stockPckgs: gr.stockPckgs || 0,
          dispatchedPckgs: dispatchedPckgsValue,
          weight: gr.weight || 0,
          bookingType: gr.bookingType || 'manual',
          bookingId: bookingIdValue
        };
      });
      
      updateData.assignedGRs = formattedAssignedGRs;
      updateData.manifestStatus = formattedAssignedGRs.length > 0 ? 'DISPATCHED' : 'ACTIVE';
      
      const { totalPckgs, totalWeight } = calculateManifestTotals(formattedAssignedGRs);
      updateData.noOfPckgs = totalPckgs;
      updateData.grossWeight = totalWeight;
      
      console.log('Updated totals:', { totalPckgs, totalWeight });
    }
    
    if (dispatchedPckgs !== undefined && assignedGRs === undefined) {
      updateData.noOfPckgs = dispatchedPckgs;
    }
    if (dispatchedWt !== undefined && assignedGRs === undefined) {
      updateData.grossWeight = dispatchedWt;
    }
    
    const updatedManifest = await LocalManifest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedManifest,
      message: 'Dispatch details updated successfully'
    });
  } catch (error) {
    console.error('Update dispatch details error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errors.join(', ')}`,
        details: error.errors
      });
    }
    
    if (error.message.includes('Cannot dispatch more than')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get stock items (available GRs not assigned to any manifest)
// @route   GET /api/local-manifests/stock
const getStockItems = async (req, res) => {
  try {
    const { branch, destination, asOnDate } = req.query;
    
    console.log('=== GET STOCK ITEMS ===');
    console.log('Filters:', { branch, destination, asOnDate });
    
    const activeManifests = await LocalManifest.find({ status: 'active' });
    
    const assignedBookingIds = new Set();
    activeManifests.forEach(manifest => {
      if (manifest.assignedGRs && manifest.assignedGRs.length > 0) {
        manifest.assignedGRs.forEach(gr => {
          if (gr.bookingId) {
            assignedBookingIds.add(gr.bookingId);
          }
        });
      }
    });
    
    console.log('Assigned GR IDs count:', assignedBookingIds.size);
    
    const objectIdArray = Array.from(assignedBookingIds)
      .filter(id => id && ObjectId.isValid(id))
      .map(id => new ObjectId(id));
    
    const query = { status: 'active' };
    
    if (branch && branch !== 'ALL' && branch !== 'all' && branch !== '') {
      query.bookingFrom = branch;
    }
    
    if (destination && destination !== 'ALL' && destination !== 'all' && destination !== '') {
      query.destination = { $regex: destination, $options: 'i' };
    }
    
    if (asOnDate) {
      const date = new Date(asOnDate);
      date.setHours(23, 59, 59, 999);
      query.bookingDate = { $lte: date };
    }
    
    if (objectIdArray.length > 0) {
      query._id = { $nin: objectIdArray };
    }
    
    console.log('MongoDB Query for bookings:', JSON.stringify(query, null, 2));
    
    const [computerizedBookings, manualBookings] = await Promise.all([
      Booking.find(query).lean(),
      BookingManual.find(query).lean()
    ]);
    
    console.log(`Found ${computerizedBookings.length} computerized bookings`);
    console.log(`Found ${manualBookings.length} manual bookings`);
    
    const stockItems = [];
    
    computerizedBookings.forEach(booking => {
      if ((booking.totalPckgs || 0) > 0) {
        stockItems.push({
          id: booking._id,
          grNo: booking.grNo,
          grDate: booking.bookingDate,
          origin: booking.bookingFrom,
          destination: booking.destination,
          consignor: booking.consignorName,
          consignee: booking.consigneeName,
          toPay: booking.totalFreight?.toString() || '0',
          paid: '0',
          tbb: booking.totalFreight?.toString() || '0',
          stockPckgs: booking.totalPckgs || 0,
          selected: false,
          bookingType: 'computerized',
          bookingId: booking._id.toString()
        });
      }
    });
    
    manualBookings.forEach(booking => {
      if ((booking.totalPckgs || 0) > 0) {
        stockItems.push({
          id: booking._id,
          grNo: booking.grNo,
          grDate: booking.bookingDate,
          origin: booking.bookingFrom,
          destination: booking.destination,
          consignor: booking.consignorName,
          consignee: booking.consigneeName,
          toPay: booking.totalFreight?.toString() || '0',
          paid: '0',
          tbb: booking.totalFreight?.toString() || '0',
          stockPckgs: booking.totalPckgs || 0,
          selected: false,
          bookingType: 'manual',
          bookingId: booking._id.toString()
        });
      }
    });
    
    stockItems.sort((a, b) => new Date(b.grDate) - new Date(a.grDate));
    
    console.log(`Total stock items returned: ${stockItems.length}`);
    
    res.status(200).json({
      success: true,
      data: stockItems,
      total: stockItems.length
    });
  } catch (error) {
    console.error('Get stock items error:', error);
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
  updateDispatchDetails,
  getStockItems,
  cancelManifest,
  restoreManifest,
  deleteManifest,
  getManifestStats
};