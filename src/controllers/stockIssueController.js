const StockIssue = require('../models/StockIssue');

// Helper: Generate Issue ID
const generateIssueId = () => {
  const now = new Date();
  const ts = now.getTime().toString().slice(-6);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ISS${ts}${rand}`;
};

// ==================== CREATE ====================
exports.createStockIssue = async (req, res) => {
  try {
    const {
      issueTo, issueDate, itemName, unitType,
      quantity, startNo, endNo, remarks, status
    } = req.body;

    if (!issueTo) return res.status(400).json({ error: 'Branch is required' });
    if (!itemName) return res.status(400).json({ error: 'Item name is required' });
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    const issueId = generateIssueId();

    const newIssue = new StockIssue({
      issueId,
      issueTo,
      issueDate: issueDate || format(new Date(), 'dd-MM-yyyy'),
      itemName,
      unitType: unitType || 'PCS',
      quantity: Number(quantity),
      startNo: startNo || '',
      endNo: endNo || '',
      remarks: remarks || '',
      status: status || 'Issued',
      createdBy: req.user?.email || 'SYSTEM',
    });

    await newIssue.save();

    // ✅ OPTIONAL: Auto-update Stock Register? 
    // Stock Register is computed view, so no need to update separately.

    res.status(201).json({ success: true, issueId, data: newIssue });
  } catch (error) {
    console.error('Create stock issue error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== GET ALL (with filters) ====================
exports.getStockIssues = async (req, res) => {
  try {
    const { branch, item, fromDate, toDate } = req.query;

    const filter = {};

    if (branch) filter.issueTo = branch;
    if (item) filter.itemName = item;

    if (fromDate && toDate) {
      // Since dates are stored as "dd-mm-yyyy" strings
      // We need to compare as strings (lexicographically)
      filter.issueDate = { $gte: fromDate, $lte: toDate };
    }

    const issues = await StockIssue.find(filter)
      .sort({ issueDate: -1, createdAt: -1 })
      .lean();

    res.json(issues);
  } catch (error) {
    console.error('Get stock issues error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== GET BY ID ====================
exports.getStockIssueById = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await StockIssue.findOne({ issueId: id });
    if (!issue) {
      return res.status(404).json({ error: 'Stock issue not found' });
    }
    res.json(issue);
  } catch (error) {
    console.error('Get stock issue error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== UPDATE ====================
exports.updateStockIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const issue = await StockIssue.findOneAndUpdate(
      { issueId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!issue) {
      return res.status(404).json({ error: 'Stock issue not found' });
    }
    res.json(issue);
  } catch (error) {
    console.error('Update stock issue error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== DELETE ====================
exports.deleteStockIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await StockIssue.findOneAndDelete({ issueId: id });
    if (!issue) {
      return res.status(404).json({ error: 'Stock issue not found' });
    }
    res.json({ success: true, message: 'Stock issue deleted successfully' });
  } catch (error) {
    console.error('Delete stock issue error:', error);
    res.status(500).json({ error: error.message });
  }
};