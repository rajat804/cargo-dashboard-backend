// controllers/localManifestController.js
const LocalManifest = require('../models/LocalManifest');
const Booking = require('../models/Booking');
const BookingManual = require('../models/BookingManual');
const mongoose = require('mongoose');
const { Types: { ObjectId } } = mongoose;

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

// controllers/localManifestController.js - Update this function

// @desc    Update dispatch details (assigned GRs)
// @route   PUT /api/local-manifests/:id/dispatch
// @desc    Update dispatch details (assigned GRs)
// @route   PUT /api/local-manifests/:id/dispatch
// @access  Private
const updateDispatchDetails = async (req, res) => {
  try {
    const { dispatchedPckgs, dispatchedWt, assignedGRs } = req.body;
    
    console.log('=== UPDATE DISPATCH DETAILS ===');
    console.log('Manifest ID:', req.params.id);
    console.log('dispatchedPckgs:', dispatchedPckgs);
    console.log('dispatchedWt:', dispatchedWt);
    console.log('assignedGRs count:', assignedGRs?.length);
    
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
    
    if (dispatchedPckgs !== undefined) updateData.noOfPckgs = dispatchedPckgs;
    if (dispatchedWt !== undefined) updateData.grossWeight = dispatchedWt;
    
    // Fix assignedGRs - ensure bookingId is present
    if (assignedGRs !== undefined) {
      const formattedAssignedGRs = assignedGRs.map(gr => {
        // If bookingId is missing, use id as fallback
        const bookingIdValue = gr.bookingId || gr.id;
        
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
          dispatchedPckgs: gr.dispatchedPckgs || 0,
          weight: gr.weight || 0,
          bookingType: gr.bookingType || 'manual',
          bookingId: bookingIdValue
        };
      });
      
      updateData.assignedGRs = formattedAssignedGRs;
      
      // FIX: Update manifestStatus to DISPATCHED if GRs are assigned
      if (formattedAssignedGRs.length > 0) {
        updateData.manifestStatus = 'DISPATCHED';
        console.log(`Manifest status updated to DISPATCHED (${formattedAssignedGRs.length} GRs assigned)`);
      } else {
        // If no GRs assigned, keep as ACTIVE
        updateData.manifestStatus = 'ACTIVE';
      }
      
      console.log('Formatted assignedGRs with bookingId:', formattedAssignedGRs.map(g => ({ grNo: g.grNo, bookingId: g.bookingId })));
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
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errors.join(', ')}`,
        details: error.errors
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
    
    // Get all active manifests to find assigned GRs
    const activeManifests = await LocalManifest.find({ status: 'active' });
    
    // FIX: Collect all assigned bookingIds as strings first
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
    
    // FIX: Convert string IDs to ObjectIds for proper comparison
    const objectIdArray = Array.from(assignedBookingIds)
      .filter(id => id && ObjectId.isValid(id))
      .map(id => new ObjectId(id));
    
    // Build query for bookings
    const query = { status: 'active' };
    
    // Add filters
    if (branch && branch !== 'ALL' && branch !== 'all' && branch !== '') {
      query.bookingFrom = branch;
      console.log('Filtering by branch:', branch);
    }
    
    if (destination && destination !== 'ALL' && destination !== 'all' && destination !== '') {
      query.destination = { $regex: destination, $options: 'i' };
      console.log('Filtering by destination:', destination);
    }
    
    if (asOnDate) {
      const date = new Date(asOnDate);
      date.setHours(23, 59, 59, 999);
      query.bookingDate = { $lte: date };
      console.log('Filtering by date (up to):', date);
    }
    
    // Exclude already assigned GRs - FIX: Use ObjectId array
    if (objectIdArray.length > 0) {
      query._id = { $nin: objectIdArray };
    }
    
    console.log('MongoDB Query for bookings:', JSON.stringify(query, null, 2));
    
    // Fetch from both Computerized and Manual bookings
    const [computerizedBookings, manualBookings] = await Promise.all([
      Booking.find(query).lean(),
      BookingManual.find(query).lean()
    ]);
    
    console.log(`Found ${computerizedBookings.length} computerized bookings`);
    console.log(`Found ${manualBookings.length} manual bookings`);
    
    // Transform bookings to stock items format
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
    
    // Sort by GR date (newest first)
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