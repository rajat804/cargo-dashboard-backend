const express = require('express');
const router = express.Router();
const {
  createStockIssue,
  getAllStockIssues,
  getStockIssueById,
  updateStockIssue,
  deleteStockIssue,
} = require('../controllers/stockIssueController');

router.post('/', createStockIssue);
router.get('/', getAllStockIssues);
router.get('/:id', getStockIssueById);
router.put('/:id', updateStockIssue);
router.delete('/:id', deleteStockIssue);

module.exports = router;