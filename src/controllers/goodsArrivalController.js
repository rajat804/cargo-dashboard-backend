// controllers/goodsArrivalController.js
const GoodsArrival = require('../models/GoodsArrival');
const LocalManifest = require('../models/LocalManifest');
const mongoose = require('mongoose');

// Helper function to generate arrival number
function generateArrivalNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ARR${year}${month}${day}${random}`;
}

// Helper function to format date
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

// @desc    Create new goods arrival
// @route   POST /api/goods-arrival
// @access  Private
exports.createGoodsArrival = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      branch,
      selectGodown,
      manifestNo,
      despatchOn,
      despatchTime,
      fromStation,
      modeType,
      modeName,
      driver,
      mobile,
      unloadingPerson,
      serArrivalNo,
      autoArrival,
      receiveDate,
      receiveTime,
      unloadingHours,
      unloadingMinutes,
      route,
      tat,
      scheduleArrivalDateTime,
      vehicleQueNo,
      vehicleArrivalDateTime,
      deviation,
      unloadingDateTime,
      sealNo,
      sealOk,
      dharamKantaWeight,
      remarks,
      excessReceiptWithoutGR,
      grItems,
      damageClaims,
      linkedManifestId
    } = req.body;
    
    // Check if arrival already exists for this manifest
    const existingArrival = await GoodsArrival.findOne({ manifestNo });
    if (existingArrival) {
      return res.status(400).json({
        success: false,
        message: `Goods arrival already exists for manifest: ${manifestNo}`
      });
    }
    
    // Find and validate linked manifest
    const linkedManifest = await LocalManifest.findById(linkedManifestId);
    if (!linkedManifest) {
      return res.status(404).json({
        success: false,
        message: 'Linked manifest not found'
      });
    }
    
    // Check if manifest is already arrived
    if (linkedManifest.manifestStatus === 'ARRIVED') {
      return res.status(400).json({
        success: false,
        message: `Manifest ${linkedManifest.manifestNo} has already been marked as arrived`
      });
    }
    
    // FIX: Ensure despatchOn is a valid date
    let finalDespatchOn;
    if (despatchOn) {
      finalDespatchOn = new Date(despatchOn);
      // Check if date is valid
      if (isNaN(finalDespatchOn.getTime())) {
        finalDespatchOn = linkedManifest.date || new Date();
      }
    } else if (linkedManifest && linkedManifest.date) {
      finalDespatchOn = new Date(linkedManifest.date);
    } else {
      finalDespatchOn = new Date();
    }
    
    // Create goods arrival
    const goodsArrival = new GoodsArrival({
      branch,
      selectGodown,
      manifestNo,
      despatchOn: finalDespatchOn,
      despatchTime: despatchTime || '',
      fromStation,
      modeType: modeType || 'SURFACE',
      modeName: modeName || '',
      driver: driver || '',
      mobile: mobile || '',
      unloadingPerson,
      serArrivalNo: autoArrival ? generateArrivalNumber() : (serArrivalNo || ''),
      autoArrival: autoArrival !== undefined ? autoArrival : true,
      receiveDate: new Date(receiveDate),
      receiveTime: receiveTime || '',
      unloadingHours: unloadingHours || 0,
      unloadingMinutes: unloadingMinutes || 0,
      route: route || '',
      tat: tat || 0,
      scheduleArrivalDateTime: scheduleArrivalDateTime ? new Date(scheduleArrivalDateTime) : null,
      vehicleQueNo: vehicleQueNo || '',
      vehicleArrivalDateTime: vehicleArrivalDateTime ? new Date(vehicleArrivalDateTime) : null,
      deviation: deviation || '',
      unloadingDateTime: unloadingDateTime ? new Date(unloadingDateTime) : null,
      sealNo: sealNo || '',
      sealOk: sealOk !== undefined ? sealOk : true,
      dharamKantaWeight: dharamKantaWeight || 0,
      remarks: remarks || '',
      excessReceiptWithoutGR: excessReceiptWithoutGR || false,
      grItems: grItems || [],
      damageClaims: damageClaims || [],
      linkedManifest: linkedManifestId,
      createdBy: req.user?.email || 'SYSTEM',
      arrivalStatus: 'ARRIVED'
    });
    
    await goodsArrival.save({ session });
    
    // Update linked manifest status
    if (linkedManifest) {
      linkedManifest.manifestStatus = 'ARRIVED';
      linkedManifest.actualArrivalDate = new Date();
      linkedManifest.goodsArrivalRef = goodsArrival._id;
      linkedManifest.updatedBy = req.user?.email || 'SYSTEM';
      linkedManifest.updatedAt = new Date();
      await linkedManifest.save({ session });
    }
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: 'Goods arrival created successfully',
      data: goodsArrival
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Create goods arrival error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goods arrival',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get all goods arrivals with filters
// @route   GET /api/goods-arrival
// @access  Private
exports.getGoodsArrivals = async (req, res) => {
  try {
    const {
      branch,
      despatchFrom,
      manifestType,
      modeType,
      fromDate,
      toDate,
      arrivalStatus,
      search,
      page = 1,
      limit = 10
    } = req.query;
    
    let query = {};
    
    // Apply filters
    if (branch && branch !== 'ALL') query.branch = branch;
    if (despatchFrom && despatchFrom !== 'ALL') query.fromStation = despatchFrom;
    if (modeType && modeType !== 'ALL') query.modeType = modeType;
    if (arrivalStatus && arrivalStatus !== 'ALL') query.arrivalStatus = arrivalStatus;
    
    // Date range filter
    if (fromDate || toDate) {
      query.receiveDate = {};
      if (fromDate) query.receiveDate.$gte = new Date(fromDate);
      if (toDate) query.receiveDate.$lte = new Date(toDate);
    }
    
    // Search by manifest number or ser arrival number
    if (search) {
      query.$or = [
        { manifestNo: { $regex: search, $options: 'i' } },
        { serArrivalNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [arrivals, total] = await Promise.all([
      GoodsArrival.find(query)
        .populate('linkedManifest', 'vehicleNo driverName despatchFrom despatchTo')
        .sort({ receiveDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      GoodsArrival.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      data: arrivals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get goods arrivals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goods arrivals',
      error: error.message
    });
  }
};

// @desc    Get pending arrivals (from manifests not yet arrived)
// @route   GET /api/goods-arrival/pending
// @access  Private
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
    
    // Build query for manifests that are active and not arrived
    let manifestQuery = {
      status: 'active',
      manifestStatus: { $in: ['ACTIVE', 'IN_TRANSIT', 'DISPATCHED'] }
    };
    
    if (branch && branch !== 'ALL') manifestQuery.branch = branch;
    if (despatchFrom && despatchFrom !== 'ALL') manifestQuery.branch = despatchFrom;
    if (manifestType && manifestType !== 'ALL') manifestQuery.manifestType = manifestType;
    if (modeType && modeType !== 'ALL') manifestQuery.modeType = modeType;
    if (vehicleNo && vehicleNo !== 'ALL') manifestQuery.vehicleNo = { $regex: vehicleNo, $options: 'i' };
    if (driverName && driverName !== 'ALL') manifestQuery.driverName = { $regex: driverName, $options: 'i' };
    
    // Date range filter
    if (fromDate || toDate) {
      manifestQuery.date = {};
      if (fromDate) manifestQuery.date.$gte = new Date(fromDate);
      if (toDate) manifestQuery.date.$lte = new Date(toDate);
    }
    
    // Exclude manifests that already have goods arrival
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
        .limit(parseInt(limit)),
      LocalManifest.countDocuments(manifestQuery)
    ]);
    
    // FIX: Transform to pending arrival format with all fields frontend expects
    const pendingArrivals = manifests.map(manifest => ({
      _id: manifest._id,
      manifestNo: manifest.manifestNo,
      manifestDate: manifest.date,
      // FIX: Add both field names for compatibility
      branch: manifest.branch,
      fromStation: manifest.branch,
      despatchFrom: manifest.branch,
      toStation: manifest.toStation,
      despatchTo: manifest.toStation,
      divisionName: manifest.divisionName,
      modeName: manifest.modeName || manifest.vehicleNo,
      modeCategory: manifest.modeCategory,
      category: manifest.category,
      arrivalStatus: 'PENDING',
      lhcNo: manifest.lhcNo || '',
      vehicleNo: manifest.vehicleNo,
      driverName: manifest.driverName,
      driverMobile: manifest.driverMobile,
      noOfPickups: manifest.noOfPckgs,
      grossWeight: manifest.grossWeight,
      totalPackages: manifest.noOfPckgs,
      totalWeight: manifest.grossWeight,
      assignedGRs: manifest.assignedGRs || []
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
    console.error('Get pending arrivals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending arrivals',
      error: error.message
    });
  }
};

// @desc    Get single goods arrival by ID
// @route   GET /api/goods-arrival/:id
// @access  Private
exports.getGoodsArrivalById = async (req, res) => {
  try {
    const goodsArrival = await GoodsArrival.findById(req.params.id)
      .populate('linkedManifest', 'vehicleNo driverName despatchFrom despatchTo totalPackages totalWeight');
    
    if (!goodsArrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: goodsArrival
    });
    
  } catch (error) {
    console.error('Get goods arrival by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goods arrival',
      error: error.message
    });
  }
};

// @desc    Update goods arrival
// @route   PUT /api/goods-arrival/:id
// @access  Private
exports.updateGoodsArrival = async (req, res) => {
  try {
    const {
      branch,
      selectGodown,
      fromStation,
      modeType,
      modeName,
      driver,
      mobile,
      unloadingPerson,
      receiveDate,
      receiveTime,
      unloadingHours,
      unloadingMinutes,
      route,
      tat,
      scheduleArrivalDateTime,
      vehicleQueNo,
      vehicleArrivalDateTime,
      deviation,
      unloadingDateTime,
      sealNo,
      sealOk,
      dharamKantaWeight,
      remarks,
      grItems,
      damageClaims,
      arrivalStatus
    } = req.body;
    
    const goodsArrival = await GoodsArrival.findById(req.params.id);
    
    if (!goodsArrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }
    
    // Update fields
    if (branch) goodsArrival.branch = branch;
    if (selectGodown) goodsArrival.selectGodown = selectGodown;
    if (fromStation) goodsArrival.fromStation = fromStation;
    if (modeType) goodsArrival.modeType = modeType;
    if (modeName) goodsArrival.modeName = modeName;
    if (driver) goodsArrival.driver = driver;
    if (mobile) goodsArrival.mobile = mobile;
    if (unloadingPerson) goodsArrival.unloadingPerson = unloadingPerson;
    if (receiveDate) goodsArrival.receiveDate = new Date(receiveDate);
    if (receiveTime) goodsArrival.receiveTime = receiveTime;
    if (unloadingHours !== undefined) goodsArrival.unloadingHours = unloadingHours;
    if (unloadingMinutes !== undefined) goodsArrival.unloadingMinutes = unloadingMinutes;
    if (route) goodsArrival.route = route;
    if (tat !== undefined) goodsArrival.tat = tat;
    if (scheduleArrivalDateTime) goodsArrival.scheduleArrivalDateTime = new Date(scheduleArrivalDateTime);
    if (vehicleQueNo) goodsArrival.vehicleQueNo = vehicleQueNo;
    if (vehicleArrivalDateTime) goodsArrival.vehicleArrivalDateTime = new Date(vehicleArrivalDateTime);
    if (deviation) goodsArrival.deviation = deviation;
    if (unloadingDateTime) goodsArrival.unloadingDateTime = new Date(unloadingDateTime);
    if (sealNo) goodsArrival.sealNo = sealNo;
    if (sealOk !== undefined) goodsArrival.sealOk = sealOk;
    if (dharamKantaWeight !== undefined) goodsArrival.dharamKantaWeight = dharamKantaWeight;
    if (remarks) goodsArrival.remarks = remarks;
    if (grItems) goodsArrival.grItems = grItems;
    if (damageClaims) goodsArrival.damageClaims = damageClaims;
    if (arrivalStatus) goodsArrival.arrivalStatus = arrivalStatus;
    
    goodsArrival.updatedBy = req.user?.email || 'SYSTEM';
    goodsArrival.updatedAt = new Date();
    
    await goodsArrival.save();
    
    res.status(200).json({
      success: true,
      message: 'Goods arrival updated successfully',
      data: goodsArrival
    });
    
  } catch (error) {
    console.error('Update goods arrival error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goods arrival',
      error: error.message
    });
  }
};

// @desc    Delete goods arrival
// @route   DELETE /api/goods-arrival/:id
// @access  Private
exports.deleteGoodsArrival = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const goodsArrival = await GoodsArrival.findById(req.params.id);
    
    if (!goodsArrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }
    
    // Update linked manifest back to in transit
    if (goodsArrival.linkedManifest) {
      await LocalManifest.findByIdAndUpdate(
        goodsArrival.linkedManifest,
        {
          manifestStatus: 'IN_TRANSIT',
          goodsArrivalRef: null,
          updatedBy: req.user?.email || 'SYSTEM',
          updatedAt: new Date()
        },
        { session }
      );
    }
    
    await goodsArrival.deleteOne({ session });
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      message: 'Goods arrival deleted successfully'
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete goods arrival error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goods arrival',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Print arrival report
// @route   GET /api/goods-arrival/:id/print
// @access  Private
exports.printGoodsArrival = async (req, res) => {
  try {
    const goodsArrival = await GoodsArrival.findById(req.params.id)
      .populate('linkedManifest', 'vehicleNo driverName despatchFrom despatchTo');
    
    if (!goodsArrival) {
      return res.status(404).json({
        success: false,
        message: 'Goods arrival not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        goodsArrival,
        printDate: new Date(),
        companyDetails: {
          name: 'GOLDEN ROADWAYS & LOGISTICS PVT LTD',
          address: 'Corporate Office',
          email: 'MAYANK.GRLOGISTICS@GMAIL.COM'
        }
      }
    });
    
  } catch (error) {
    console.error('Print goods arrival error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate print report',
      error: error.message
    });
  }
};

// @desc    Export goods arrivals to Excel
// @route   GET /api/goods-arrival/export
// @access  Private
exports.exportGoodsArrivals = async (req, res) => {
  try {
    const { branch, fromDate, toDate, arrivalStatus } = req.query;
    
    let query = {};
    if (branch && branch !== 'ALL') query.branch = branch;
    if (arrivalStatus && arrivalStatus !== 'ALL') query.arrivalStatus = arrivalStatus;
    
    if (fromDate || toDate) {
      query.receiveDate = {};
      if (fromDate) query.receiveDate.$gte = new Date(fromDate);
      if (toDate) query.receiveDate.$lte = new Date(toDate);
    }
    
    const arrivals = await GoodsArrival.find(query)
      .populate('linkedManifest', 'vehicleNo driverName')
      .sort({ receiveDate: -1 });
    
    // Format data for Excel export
    const exportData = arrivals.map(arrival => ({
      'Manifest #': arrival.manifestNo,
      'Arrival #': arrival.serArrivalNo,
      'Receive Date': formatDate(arrival.receiveDate),
      'From Station': arrival.fromStation,
      'Driver': arrival.driver,
      'Vehicle #': arrival.linkedManifest?.vehicleNo || '',
      'Mode': arrival.modeType,
      'No of GR': arrival.arrivalTotals?.noOfGR || 0,
      'Total Packages': arrival.arrivalTotals?.totalPckgs || 0,
      'Total Weight': arrival.arrivalTotals?.totalWeight || 0,
      'Damage Packages': arrival.arrivalTotals?.damagePckgs || 0,
      'Status': arrival.arrivalStatus,
      'Remarks': arrival.remarks
    }));
    
    res.status(200).json({
      success: true,
      data: exportData,
      count: exportData.length
    });
    
  } catch (error) {
    console.error('Export goods arrivals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export goods arrivals',
      error: error.message
    });
  }
};