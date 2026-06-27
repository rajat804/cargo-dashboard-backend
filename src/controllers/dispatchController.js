const Dispatch = require('../models/Dispatch');

// Create New Dispatch
exports.createDispatch = async (req, res) => {
  try {
    const dispatchData = req.body;
    
    const newDispatch = new Dispatch({
      ...dispatchData,
      dispatchId: dispatchData.dispatchId || `DISP/${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}/${Date.now().toString().slice(-4)}`,
      createdBy: req.user?.email || 'ADMIN'
    });

    await newDispatch.save();

    res.status(201).json({
      success: true,
      message: "Dispatch created successfully",
      data: newDispatch
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error creating dispatch",
      error: error.message
    });
  }
};

// Get All Dispatches
exports.getAllDispatches = async (req, res) => {
  try {
    const { branchName, dispatchedTo, status } = req.query;
    
    let filter = {};
    if (branchName) filter.branchName = branchName;
    if (dispatchedTo) filter.dispatchedTo = dispatchedTo;
    if (status) filter.status = status;

    const dispatches = await Dispatch.find(filter)
      .sort({ createdAt: -1 });

    res.json(dispatches);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching dispatches",
      error: error.message
    });
  }
};

// Get Dispatch by ID
exports.getDispatchById = async (req, res) => {
  try {
    const dispatch = await Dispatch.findById(req.params.id);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found" });
    }
    res.json(dispatch);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Dispatch
exports.updateDispatch = async (req, res) => {
  try {
    const updatedDispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedDispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found" });
    }
    res.json({
      success: true,
      message: "Dispatch updated successfully",
      data: updatedDispatch
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete Dispatch
exports.deleteDispatch = async (req, res) => {
  try {
    const dispatch = await Dispatch.findByIdAndDelete(req.params.id);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found" });
    }
    res.json({ success: true, message: "Dispatch deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Dispatches by Branch (for search)
exports.getDispatchesByBranch = async (req, res) => {
  try {
    const { branchName } = req.params;
    const dispatches = await Dispatch.find({ branchName }).sort({ createdAt: -1 });
    res.json(dispatches);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getNextGrNumber = async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ success: false, error: 'Branch is required' });
    }

    const prefix = branch.substring(0, 2).toUpperCase();

    // Find existing GR numbers for this branch
    const dispatches = await Dispatch.find({
      branchName: branch,
      grBookNumber: { $regex: `^${prefix}` }
    });

    let maxNumber = 0;
    dispatches.forEach(d => {
      const num = parseInt(d.grBookNumber.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxNumber) maxNumber = num;
    });

    const next = maxNumber + 1;
    if (next > 50) {
      return res.status(400).json({ success: false, error: 'GR book limit (50) reached for this branch' });
    }

    const grNumber = `${prefix}${String(next).padStart(3, '0')}`;
    res.json({ success: true, grBookNumber: grNumber });
  } catch (error) {
    console.error('Error in getNextGrNumber:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};