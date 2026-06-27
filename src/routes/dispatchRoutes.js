const express = require('express');
const router = express.Router();
const {
  createDispatch,
  getAllDispatches,
  getDispatchById,
  updateDispatch,
  deleteDispatch,
  getDispatchesByBranch,
  getNextGrNumber
} = require('../controllers/dispatchController');

// ─── MUST COME BEFORE /:id ───
router.get('/next-gr-number', getNextGrNumber);   // ✅ moved up

// ─── Main Routes ───
router.post('/', createDispatch);
router.get('/', getAllDispatches);
router.get('/:id', getDispatchById);              // ⚠️ now after /next-gr-number
router.put('/:id', updateDispatch);
router.delete('/:id', deleteDispatch);

// Additional Routes
router.get('/branch/:branchName', getDispatchesByBranch);

module.exports = router;