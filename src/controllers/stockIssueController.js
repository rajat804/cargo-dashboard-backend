const StockIssue = require('../models/StockIssue');
const { format } = require('date-fns'); // ✅ Import format

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
    
    // ✅ Try both _id and issueId
    const issue = await StockIssue.findOne({ 
      $or: [{ _id: id }, { issueId: id }] 
    });
    
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

    console.log(`📤 Updating stock issue with id: ${id}`);
    console.log('📝 Update data:', updateData);

    // ✅ Try both _id and issueId
    let issue = await StockIssue.findOne({ _id: id });
    if (!issue) {
      issue = await StockIssue.findOne({ issueId: id });
    }

    if (!issue) {
      console.log(`❌ Stock issue not found with id: ${id}`);
      return res.status(404).json({ error: 'Stock issue not found' });
    }

    // ✅ Update the issue
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        issue[key] = updateData[key];
      }
    });

    await issue.save();

    console.log(`✅ Stock issue updated successfully: ${issue._id}`);
    res.json({ success: true, data: issue });
  } catch (error) {
    console.error('Update stock issue error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== DELETE ====================
exports.deleteStockIssue = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📤 Deleting stock issue with id: ${id}`);

    // ✅ Try both _id and issueId
    let issue = await StockIssue.findOne({ _id: id });
    if (!issue) {
      issue = await StockIssue.findOne({ issueId: id });
    }

    if (!issue) {
      console.log(`❌ Stock issue not found with id: ${id}`);
      return res.status(404).json({ error: 'Stock issue not found' });
    }

    await StockIssue.deleteOne({ _id: issue._id });

    console.log(`✅ Stock issue deleted successfully: ${issue._id}`);
    res.json({ success: true, message: 'Stock issue deleted successfully' });
  } catch (error) {
    console.error('Delete stock issue error:', error);
    res.status(500).json({ error: error.message });
  }
};