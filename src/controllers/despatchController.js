const Despatch = require('../models/Despatch');


// no use despatchcontroller

// @desc    Get all despatch records (with optional search)
// @route   GET /api/despatch?search=...
exports.getAllDespatches = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter = {
        $or: [
          { despatchId: regex },
          { despatchFrom: regex },
          { despatchedTo: regex },
          { wayBillNo: regex },
          { courierVendor: regex },
        ],
      };
    }
    const records = await Despatch.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending despatch records for a branch
// @route   GET /api/despatch/pending?branch=BRANCH_NAME
exports.getPendingDespatches = async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) return res.status(400).json({ message: 'Branch name required' });

    const records = await Despatch.find({
      despatchFrom: branch,
      status: { $ne: 'Received' },
    }).sort({ createdAt: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark despatch as received
// @route   PUT /api/despatch/receive/:id
exports.receiveDespatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedBy } = req.body;

    const updated = await Despatch.findByIdAndUpdate(
      id,
      {
        status: 'Received',
        receivedOn: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
        receivedBy: receivedBy || 'SYSTEM',
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Despatch not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a despatch
// @route   PUT /api/despatch/cancel/:id
exports.cancelDespatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Despatch.findByIdAndUpdate(
      id,
      { status: 'Cancelled' },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Despatch not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};