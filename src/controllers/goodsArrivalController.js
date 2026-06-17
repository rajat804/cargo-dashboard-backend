// ============================================
// src/controllers/goodsArrivalController.js
// ============================================
const GoodsArrival = require('../models/GoodsArrival');
const LocalManifest = require('../models/LocalManifest');
const mongoose = require('mongoose');

// ============================================
// HELPER FUNCTIONS
// ============================================
const generateArrivalNumber = async () => {
  const count = await GoodsArrival.countDocuments();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `ARV${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
};

// ============================================
// CREATE GOODS ARRIVAL
// ============================================
exports.createGoodsArrival = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      branch, selectGodown, manifestNo, isAutoManifest,
      despatchOn, despatchTime, fromStation, modeType, modeName,
      driver, mobile, unloadingPerson, receiveDate, receiveTime,
      serArrivalNo, autoArrival, unloadingHours, unloadingMinutes,
      route, tat, scheduleArrivalDateTime, vehicleQueNo,
      vehicleArrivalDateTime, deviation, unloadingDateTime,
      sealNo, sealOk, dharamKantaWeight, remarks,
      excessReceiptWithoutGR, grItems,
      damageType, damageReason, damageOtherRemark,
      damagePackageCount, damagePhotos, damageRemarks,
      shortExcessType, shortDetails, excessDetails,
      voiceNoteUrl, voiceNoteDuration,
      linkedManifestId
    } = req.body;

    // Validate required fields
    if (!branch) {
      return res.status(400).json({ success: false, message: 'Branch is required' });
    }
    if (!selectGodown) {
      return res.status(400).json({ success: false, message: 'Godown is required' });
    }
    if (!manifestNo) {
      return res.status(400).json({ success: false, message: 'Manifest number is required' });
    }
    if (!unloadingPerson) {
      return res.status(400).json({ success: false, message: 'Unloading person is required' });
    }

    // Check if arrival already exists
    const existingArrival = await GoodsArrival.findOne({ manifestNo });
    if (existingArrival) {
      return res.status(400).json({
        success: false,
        message: `Arrival already exists for manifest ${manifestNo}`
      });
    }

    // Get linked manifest
    let linkedManifest = null;
    if (linkedManifestId) {
      linkedManifest = await LocalManifest.findById(linkedManifestId);
      if (!linkedManifest) {
        return res.status(404).json({
          success: false,
          message: 'Linked manifest not found'
        });
      }
    }

    // If no linkedManifestId but manifestNo exists, try to find by manifestNo
    if (!linkedManifest && manifestNo) {
      linkedManifest = await LocalManifest.findOne({ manifestNo });
    }

    // Validate despatchOn
    let finalDespatchOn = despatchOn ? new Date(despatchOn) : new Date();
    if (isNaN(finalDespatchOn.getTime())) {
      finalDespatchOn = linkedManifest?.date || new Date();
    }

    // Generate serial arrival number
    let finalSerArrivalNo = serArrivalNo;
    if (autoArrival !== false && !serArrivalNo) {
      finalSerArrivalNo = await generateArrivalNumber();
    }

    // Create arrival
    const arrival = new GoodsArrival({
      branch,
      selectGodown,
      manifestNo,
      isAutoManifest: isAutoManifest !== undefined ? isAutoManifest : true,
      despatchOn: finalDespatchOn,
      despatchTime: despatchTime || '',
      fromStation: fromStation || '',
      modeType: modeType || 'SURFACE',
      modeName: modeName || '',
      driver: driver || '',
      mobile: mobile || '',
      unloadingPerson,
      receiveDate: receiveDate ? new Date(receiveDate) : new Date(),
      receiveTime: receiveTime || '',
      serArrivalNo: finalSerArrivalNo,
      autoArrival: autoArrival !== undefined ? autoArrival : true,
      unloadingHours: unloadingHours || 0,
      unloadingMinutes: unloadingMinutes || 0,
      route: route || '',
      tat: tat || 0,
      scheduleArrivalDateTime: scheduleArrivalDateTime ? new Date(scheduleArrivalDateTime) : new Date(),
      vehicleQueNo: vehicleQueNo || '',
      vehicleArrivalDateTime: vehicleArrivalDateTime ? new Date(vehicleArrivalDateTime) : new Date(),
      deviation: deviation || '',
      unloadingDateTime: unloadingDateTime ? new Date(unloadingDateTime) : new Date(),
      sealNo: sealNo || '',
      sealOk: sealOk !== undefined ? sealOk : true,
      dharamKantaWeight: dharamKantaWeight || 0,
      remarks: remarks || '',
      excessReceiptWithoutGR: excessReceiptWithoutGR || false,
      grItems: grItems || [],
      linkedManifestId: linkedManifest?._id || null,
      damageType: damageType || [],
      damageReason: damageReason || '',
      damageOtherRemark: damageOtherRemark || '',
      damagePackageCount: damagePackageCount || 0,
      damagePhotos: damagePhotos || [],
      damageRemarks: damageRemarks || '',
      shortExcessType: shortExcessType || [],
      shortDetails: shortDetails || '',
      excessDetails: excessDetails || '',
      voiceNoteUrl: voiceNoteUrl || '',
      voiceNoteDuration: voiceNoteDuration || 0,
      createdBy: req.user?.email || 'SYSTEM',
      status: 'active',
      arrivalStatus: 'ARRIVED'
    });

    await arrival.save({ session });

    // Update manifest status
    if (linkedManifest) {
      linkedManifest.status = 'active';
      linkedManifest.manifestStatus = 'ARRIVED';
      linkedManifest.actualArrivalDate = new Date();
      linkedManifest.goodsArrivalRef = arrival._id;
      linkedManifest.updatedAt = new Date();
      await linkedManifest.save({ session });
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Goods arrival recorded successfully',
      data: arrival
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Create Goods Arrival Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create goods arrival',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET PENDING ARRIVALS (from manifests)
// ============================================
exports.getPendingArrivals = async (req, res) => {
  try {
    const {
      branch,
      despatchFrom,
      manifestType,
      modeType,
      fromDate,
      toDate,
      vehicleNo,
      driverName,
      page = 1,
      limit = 10
    } = req.query;

    // Build query for manifests not yet arrived
    let manifestQuery = {
      status: { $in: ['active'] },
      manifestStatus: { $in: ['ACTIVE', 'IN_TRANSIT', 'DISPATCHED'] }
    };

    if (branch && branch !== 'ALL') manifestQuery.branch = branch;
    if (despatchFrom && despatchFrom !== 'ALL') manifestQuery.branch = despatchFrom;
    if (modeType && modeType !== 'ALL') manifestQuery.modeCategory = modeType;
    if (vehicleNo && vehicleNo !== 'ALL') manifestQuery.vehicleNo = { $regex: vehicleNo, $options: 'i' };
    if (driverName && driverName !== 'ALL') manifestQuery.driverName = { $regex: driverName, $options: 'i' };

    if (fromDate || toDate) {
      manifestQuery.date = {};
      if (fromDate) manifestQuery.date.$gte = new Date(fromDate);
      if (toDate) manifestQuery.date.$lte = new Date(toDate);
    }

    // Exclude manifests that already have arrivals
    const existingArrivals = await GoodsArrival.find({}, 'manifestNo');
    const arrivedManifestNos = existingArrivals.map(a => a.manifestNo);
    if (arrivedManifestNos.length > 0) {
      manifestQuery.manifestNo = { $nin: arrivedManifestNos };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [manifests, total] = await Promise.all([
      LocalManifest.find(manifestQuery)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LocalManifest.countDocuments(manifestQuery)
    ]);

    // Transform to pending arrival format
    const pendingArrivals = manifests.map(manifest => ({
      _id: manifest._id,
      manifestNo: manifest.manifestNo,
      manifestDate: manifest.date || manifest.createdAt,
      branch: manifest.branch,
      fromStation: manifest.branch,
      toStation: manifest.toStation,
      divisionName: manifest.divisionName || '',
      modeName: manifest.modeName || manifest.vehicleNo || '',
      modeCategory: manifest.modeCategory || 'SURFACE',
      category: manifest.modeCategory || 'SURFACE',
      lhcNo: manifest.lhcNo || '',
      vehicleNo: manifest.vehicleNo || '',
      driverName: manifest.driverName || '',
      driverMobile: manifest.driverMobile || '',
      noOfPickups: manifest.noOfPckgs || 0,
      grossWeight: manifest.grossWeight || 0,
      assignedGRs: manifest.assignedGRs || [],
      arrivalStatus: 'PENDING'
    }));

    res.status(200).json({
      success: true,
      data: pendingArrivals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get Pending Arrivals Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending arrivals',
      error: error.message
    });
  }
};

// ============================================
// GET ALL GOODS ARRIVALS
// ============================================
exports.getGoodsArrivals = async (req, res) => {
  try {
    const {
      branch,
      fromStation,
      modeType,
      fromDate,
      toDate,
      arrivalStatus,
      status,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (branch && branch !== 'ALL') query.branch = branch;
    if (fromStation && fromStation !== 'ALL') query.fromStation = fromStation;
    if (modeType && modeType !== 'ALL') query.modeType = modeType;
    if (arrivalStatus && arrivalStatus !== 'ALL') query.arrivalStatus = arrivalStatus;
    if (status && status !== 'ALL') query.status = status;

    if (fromDate || toDate) {
      query.receiveDate = {};
      if (fromDate) query.receiveDate.$gte = new Date(fromDate);
      if (toDate) query.receiveDate.$lte = new Date(toDate);
    }

    if (search) {
      query.$or = [
        { manifestNo: { $regex: search, $options: 'i' } },
        { serArrivalNo: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      GoodsArrival.find(query)
        .populate('linkedManifestId', 'vehicleNo driverName branch toStation')
        .sort({ receiveDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      GoodsArrival.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get Goods Arrivals Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch goods arrivals',
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE GOODS ARRIVAL
// ============================================
exports.getGoodsArrivalById = async (req, res) => {
  try {
    const { id } = req.params;

    const arrival = await GoodsArrival.findById(id)
      .populate('linkedManifestId', 'vehicleNo driverName branch toStation assignedGRs');

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }

    res.status(200).json({
      success: true,
      data: arrival
    });

  } catch (error) {
    console.error('Get Goods Arrival Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch goods arrival',
      error: error.message
    });
  }
};

// ============================================
// UPDATE GOODS ARRIVAL
// ============================================
exports.updateGoodsArrival = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const arrival = await GoodsArrival.findByIdAndUpdate(
      id,
      { ...updates, updatedBy: req.user?.email || 'SYSTEM' },
      { new: true, runValidators: true }
    );

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Goods arrival updated successfully',
      data: arrival
    });

  } catch (error) {
    console.error('Update Goods Arrival Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update goods arrival',
      error: error.message
    });
  }
};

// ============================================
// DELETE GOODS ARRIVAL
// ============================================
exports.deleteGoodsArrival = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const arrival = await GoodsArrival.findById(id);

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }

    // Update linked manifest back to previous state
    if (arrival.linkedManifestId) {
      await LocalManifest.findByIdAndUpdate(
        arrival.linkedManifestId,
        {
          manifestStatus: 'DISPATCHED',
          goodsArrivalRef: null,
          updatedAt: new Date()
        },
        { session }
      );
    }

    await arrival.deleteOne({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Goods arrival deleted successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Delete Goods Arrival Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete goods arrival',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// CANCEL GOODS ARRIVAL
// ============================================
exports.cancelGoodsArrival = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const arrival = await GoodsArrival.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        arrivalStatus: 'CANCELLED',
        cancelledReason: reason || 'Cancelled by user',
        updatedBy: req.user?.email || 'SYSTEM'
      },
      { new: true, session }
    );

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }

    // Update manifest status back to dispatched
    if (arrival.linkedManifestId) {
      await LocalManifest.findByIdAndUpdate(
        arrival.linkedManifestId,
        {
          manifestStatus: 'DISPATCHED',
          goodsArrivalRef: null,
          updatedAt: new Date()
        },
        { session }
      );
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Goods arrival cancelled successfully',
      data: arrival
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Cancel Goods Arrival Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel goods arrival',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// RESTORE GOODS ARRIVAL
// ============================================
exports.restoreGoodsArrival = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const arrival = await GoodsArrival.findByIdAndUpdate(
      id,
      {
        status: 'active',
        arrivalStatus: 'ARRIVED',
        cancelledReason: '',
        updatedBy: req.user?.email || 'SYSTEM'
      },
      { new: true, session }
    );

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }

    // Update manifest status back to arrived
    if (arrival.linkedManifestId) {
      await LocalManifest.findByIdAndUpdate(
        arrival.linkedManifestId,
        {
          manifestStatus: 'ARRIVED',
          goodsArrivalRef: arrival._id,
          actualArrivalDate: new Date(),
          updatedAt: new Date()
        },
        { session }
      );
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Goods arrival restored successfully',
      data: arrival
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Restore Goods Arrival Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore goods arrival',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// PRINT GOODS ARRIVAL
// ============================================
exports.printGoodsArrival = async (req, res) => {
  try {
    const { id } = req.params;

    const arrival = await GoodsArrival.findById(id)
      .populate('linkedManifestId', 'vehicleNo driverName branch toStation assignedGRs');

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }

    const printData = {
      ...arrival.toObject(),
      printDate: new Date().toISOString(),
      companyDetails: {
        name: 'GOLDEN ROADWAYS & LOGISTICS PVT LTD',
        address: 'Corporate Office',
        email: 'MAYANK.GRLOGISTICS@GMAIL.COM'
      }
    };

    res.status(200).json({
      success: true,
      data: printData
    });

  } catch (error) {
    console.error('Print Goods Arrival Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate print data',
      error: error.message
    });
  }
};

// ============================================
// EXPORT GOODS ARRIVALS
// ============================================
exports.exportGoodsArrivals = async (req, res) => {
  try {
    const { branch, fromDate, toDate, arrivalStatus } = req.query;

    const query = {};
    if (branch && branch !== 'ALL') query.branch = branch;
    if (arrivalStatus && arrivalStatus !== 'ALL') query.arrivalStatus = arrivalStatus;

    if (fromDate || toDate) {
      query.receiveDate = {};
      if (fromDate) query.receiveDate.$gte = new Date(fromDate);
      if (toDate) query.receiveDate.$lte = new Date(toDate);
    }

    const arrivals = await GoodsArrival.find(query)
      .populate('linkedManifestId', 'vehicleNo driverName')
      .sort({ receiveDate: -1 });

    const exportData = arrivals.map(arrival => ({
      'Manifest #': arrival.manifestNo,
      'Arrival #': arrival.serArrivalNo,
      'Receive Date': arrival.receiveDate?.toISOString().split('T')[0],
      'From Station': arrival.fromStation,
      'Driver': arrival.driver,
      'Vehicle #': arrival.linkedManifestId?.vehicleNo || '',
      'Mode': arrival.modeType,
      'Unloading Person': arrival.unloadingPerson,
      'Total GRs': arrival.arrivalTotals?.noOfGR || 0,
      'Total Packages': arrival.arrivalTotals?.totalPckgs || 0,
      'Total Weight': arrival.arrivalTotals?.totalWeight?.toFixed(2) || '0.00',
      'Damage Packages': arrival.arrivalTotals?.damagePckgs || 0,
      'Short': arrival.arrivalTotals?.totalShort || 0,
      'Excess': arrival.arrivalTotals?.totalExcess || 0,
      'Status': arrival.arrivalStatus,
      'Remarks': arrival.remarks || ''
    }));

    res.status(200).json({
      success: true,
      data: exportData,
      count: exportData.length
    });

  } catch (error) {
    console.error('Export Goods Arrivals Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export goods arrivals',
      error: error.message
    });
  }
};

// ============================================
// GET GOODS ARRIVAL STATS
// ============================================
exports.getGoodsArrivalStats = async (req, res) => {
  try {
    const { branch } = req.query;

    const matchQuery = {};
    if (branch && branch !== 'ALL') matchQuery.branch = branch;

    const [activeStats, cancelledStats, damageStats] = await Promise.all([
      // Active arrivals stats
      GoodsArrival.aggregate([
        { $match: { ...matchQuery, status: 'active' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalFreight: { $sum: '$arrivalTotals.totalWeight' },
            totalPackages: { $sum: '$arrivalTotals.totalPckgs' },
            totalDamage: { $sum: '$arrivalTotals.damagePckgs' }
          }
        }
      ]),
      // Cancelled arrivals stats
      GoodsArrival.aggregate([
        { $match: { ...matchQuery, status: 'cancelled' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalFreight: { $sum: '$arrivalTotals.totalWeight' }
          }
        }
      ]),
      // Damage stats
      GoodsArrival.aggregate([
        { $match: { ...matchQuery, 'arrivalTotals.damagePckgs': { $gt: 0 } } },
        {
          $group: {
            _id: null,
            totalDamagePackages: { $sum: '$arrivalTotals.damagePckgs' },
            totalShort: { $sum: '$arrivalTotals.totalShort' },
            totalExcess: { $sum: '$arrivalTotals.totalExcess' }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        active: {
          count: activeStats[0]?.count || 0,
          totalFreight: activeStats[0]?.totalFreight || 0,
          totalPackages: activeStats[0]?.totalPackages || 0,
          totalDamage: activeStats[0]?.totalDamage || 0
        },
        cancelled: {
          count: cancelledStats[0]?.count || 0,
          totalFreight: cancelledStats[0]?.totalFreight || 0
        },
        damage: {
          totalDamagePackages: damageStats[0]?.totalDamagePackages || 0,
          totalShort: damageStats[0]?.totalShort || 0,
          totalExcess: damageStats[0]?.totalExcess || 0
        }
      }
    });

  } catch (error) {
    console.error('Get Goods Arrival Stats Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stats',
      error: error.message
    });
  }
};