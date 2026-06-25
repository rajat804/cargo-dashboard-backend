const StockIssue = require('../models/StockIssue');

// Auto-generate Issue ID: ISS/YYYY-YY/XXXX
const generateIssueId = async () => {
  const count = await StockIssue.countDocuments();
  const seq = String(count + 1).padStart(4, '0');
  const year = new Date().getFullYear();
  const shortYear = String(year).slice(-2);
  const prevYear = String(year - 1).slice(-2);
  return `ISS/${prevYear}-${shortYear}/${seq}`;
};

// ==================== CREATE ====================
exports.createStockIssue = async (req, res) => {
  try {
    const issueData = req.body;
    if (!issueData.issueId) {
      issueData.issueId = await generateIssueId();
    }
    const newIssue = new StockIssue(issueData);
    await newIssue.save();
    res.status(201).json({
      success: true,
      message: 'Stock issue created',
      data: newIssue,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ==================== GET ALL (with filters) ====================
exports.getAllStockIssues = async (req, res) => {
  try {
    const { branch, item, fromDate, toDate, search } = req.query;
    let filter = {};
    if (branch) filter.issueTo = branch;
    if (item) filter.itemName = item;

    let issues = await StockIssue.find(filter).sort({ createdAt: -1 });

    // Date range filter (since stored as dd-mm-yyyy)
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : new Date(0);
      const to = toDate ? new Date(toDate) : new Date(8640000000000000);
      issues = issues.filter((issue) => {
        const parts = issue.issueDate.split('-');
        const issueDateObj = new Date(parts[2], parts[1] - 1, parts[0]);
        return issueDateObj >= from && issueDateObj <= to;
      });
    }

    // Search filter (text search)
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      issues = issues.filter(
        (issue) =>
          regex.test(issue.issueId) ||
          regex.test(issue.issueTo) ||
          regex.test(issue.itemCode) ||
          regex.test(issue.itemName) ||
          regex.test(issue.unitType) ||
          regex.test(issue.startNo) ||
          regex.test(issue.endNo)
      );
    }

    res.json(issues);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ==================== GET BY ID ====================
exports.getStockIssueById = async (req, res) => {
  try {
    const issue = await StockIssue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json(issue);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== UPDATE ====================
exports.updateStockIssue = async (req, res) => {
  try {
    const updated = await StockIssue.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({
      success: true,
      message: 'Updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== DELETE ====================
exports.deleteStockIssue = async (req, res) => {
  try {
    const deleted = await StockIssue.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};