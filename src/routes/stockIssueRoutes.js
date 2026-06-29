const express = require('express');
const router = express.Router();
const {
  createStockIssue,
  getStockIssues,
  getStockIssueById,
  updateStockIssue,
  deleteStockIssue,
} = require('../controllers/stockIssueController');

router.post('/', createStockIssue);
router.get('/', getStockIssues);
router.get('/:id', getStockIssueById);
router.put('/:id', updateStockIssue);
router.delete('/:id', deleteStockIssue);

module.exports = router;