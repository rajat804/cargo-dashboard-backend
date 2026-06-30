const Dispatch = require('../models/Dispatch');
const GrSequence = require('../models/GrSequence');

// ==================== GET ALL DISPATCHES ====================
exports.getAllDispatches = async (req, res) => {
  try {
    const dispatches = await Dispatch.find().sort({ createdAt: -1 });
    res.json(dispatches);
  } catch (error) {
    console.error('Get all dispatches error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== CREATE DISPATCH ====================
exports.createDispatch = async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.branchName) return res.status(400).json({ error: 'Branch Name is required' });
    if (!data.dispatchedTo) return res.status(400).json({ error: 'Dispatched To is required' });
    if (!data.items || data.items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Ensure grBookNumber is provided
    if (!data.grBookNumber) {
      return res.status(400).json({ error: 'GR Book Number is required. Generate it first.' });
    }

    // Generate dispatchId if not provided
    let dispatchId = data.dispatchId;
    if (!dispatchId) {
      const now = new Date();
      const year = now.getFullYear();
      const nextYear = year + 1;
      const ts = now.getTime().toString().slice(-6);
      dispatchId = `DISP/${year}-${nextYear.toString().slice(-2)}/${ts}`;
    }

    const newDispatch = new Dispatch({
      dispatchId,
      dispatchDate: data.dispatchDate,
      branchName: data.branchName,
      dispatchedTo: data.dispatchedTo,
      dispatchThrough: data.dispatchThrough || '',
      vendorGrNo: data.vendorGrNo || '',
      vendorGrDate: data.vendorGrDate || '',
      grBookNumber: data.grBookNumber,
      fromLocation: data.fromLocation || '',
      toLocation: data.toLocation || '',
      party: data.party || '',
      destination: data.destination || '',
      containerDetails: data.containerDetails || '',
      isShortDocument: data.isShortDocument || false,
      goodsType: data.goodsType || '',
      remarks: data.remarks || '',
      status: data.status || 'Dispatched',
      noOfItems: data.items.length,
      items: data.items.map(item => ({
        itemName: item.itemName,
        unitType: item.unitType,
        qty: item.qty,
        issueId: item.issueId || '',
        issueDate: item.issueDate || '',
        startNo: item.startNo || '',
        endNo: item.endNo || '',
        itemSerialNo: item.itemSerialNo || '',
        remarks: item.remarks || '',
      })),
    });

    await newDispatch.save();
    res.status(201).json({ success: true, dispatchId: newDispatch.dispatchId, data: newDispatch });
  } catch (error) {
    console.error('Create dispatch error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== UPDATE DISPATCH ====================
exports.updateDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If items present, update noOfItems
    if (updateData.items && Array.isArray(updateData.items)) {
      updateData.noOfItems = updateData.items.length;
    }

    const dispatch = await Dispatch.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    if (!dispatch) {
      return res.status(404).json({ error: 'Dispatch not found' });
    }
    res.json(dispatch);
  } catch (error) {
    console.error('Update dispatch error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== DELETE DISPATCH ====================
exports.deleteDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const dispatch = await Dispatch.findByIdAndDelete(id);
    if (!dispatch) {
      return res.status(404).json({ error: 'Dispatch not found' });
    }
    res.json({ success: true, message: 'Dispatch deleted successfully' });
  } catch (error) {
    console.error('Delete dispatch error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== GET NEXT GR NUMBER ====================
// controllers/dispatchController.js


// ✅ Dynamic prefix generator - Har branch ke liye auto prefix
const generateBranchPrefix = (branchName) => {
  // Remove special characters and spaces, take first 2 letters
  const cleanName = branchName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // If name has multiple words, take first letters (e.g., "HEAD OFFICE" → "HO")
  const words = branchName.split(' ');
  if (words.length > 1) {
    // Take first letter of each word (max 2 letters)
    let prefix = '';
    for (let i = 0; i < Math.min(words.length, 2); i++) {
      if (words[i].length > 0) {
        prefix += words[i][0].toUpperCase();
      }
    }
    return prefix || cleanName.substring(0, 2);
  }
  
  // Single word - take first 2 letters
  return cleanName.substring(0, 2);
};

exports.getNextGrNumber = async (req, res) => {
  try {
    const { branch } = req.query;
    console.log('📥 getNextGrNumber called with branch:', branch);
    
    if (!branch) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    // ✅ Dynamic prefix generation (no need for static map anymore)
    const prefix = generateBranchPrefix(branch);
    console.log('🔤 Generated prefix for branch:', branch, '→', prefix);

    // Sequence find/update
    let seq = await GrSequence.findOne({ branch });
    if (!seq) {
      console.log('🆕 Creating new sequence for branch:', branch);
      seq = new GrSequence({ 
        branch, 
        prefix, 
        currentNumber: 1,
        maxLimit: 50
      });
    }

    if (seq.currentNumber > seq.maxLimit) {
      return res.status(400).json({ 
        error: `GR number limit (${seq.maxLimit}) reached for this branch` 
      });
    }

    const paddedNum = String(seq.currentNumber).padStart(6, '0');
    const grNumber = `${prefix}${paddedNum}`;

    seq.currentNumber += 1;
    await seq.save();

    console.log('✅ GR Number generated:', grNumber);

    // ✅ Return with grNumber field
    res.json({ 
      success: true,
      grNumber: grNumber 
    });
    
  } catch (error) {
    console.error('❌ Get next GR number error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate GR number' 
    });
  }
};


// controllers/dispatchController.js

exports.receiveDespatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedBy } = req.body;
    const dispatch = await Dispatch.findById(id);
    if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });
    if (dispatch.status === "Received") {
      return res.status(400).json({ error: "Already received" });
    }
    dispatch.status = "Received";
    dispatch.receivedOn = format(new Date(), "dd-MM-yyyy");
    dispatch.receivedBy = receivedBy || "SYSTEM";
    await dispatch.save();
    res.json({ success: true, message: "Dispatch received" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancelDespatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const dispatch = await Dispatch.findById(id);
    if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });
    if (dispatch.status === "Received") {
      return res.status(400).json({ error: "Cannot cancel a received dispatch" });
    }
    dispatch.status = "Cancelled";
    dispatch.remarks = remarks || "Cancelled by user";
    await dispatch.save();
    res.json({ success: true, message: "Dispatch cancelled" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};