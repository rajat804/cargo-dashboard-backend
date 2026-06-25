const express = require('express');
const router = express.Router();
const {
  createDispatch,
  getAllDispatches,
  getDispatchById,
  updateDispatch,
  deleteDispatch,
  getDispatchesByBranch
} = require('../controllers/dispatchController');

// Main Routes
router.post('/', createDispatch);
router.get('/', getAllDispatches);
router.get('/:id', getDispatchById);
router.put('/:id', updateDispatch);
router.delete('/:id', deleteDispatch);

// Additional Routes
router.get('/branch/:branchName', getDispatchesByBranch);

module.exports = router;