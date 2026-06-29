const express = require('express');
const router = express.Router();
const {
  getAllDispatches,
  createDispatch,
  updateDispatch,
  deleteDispatch,
  getNextGrNumber,
  receiveDespatch,
  cancelDespatch,
} = require('../controllers/dispatchController');

router.get('/', getAllDispatches);
router.post('/', createDispatch);
router.put('/:id', updateDispatch);
router.delete('/:id', deleteDispatch);
router.get('/next-gr', getNextGrNumber);   // query param: ?branch=HEAD OFFICE

router.post('/:id/receive', receiveDespatch);
router.post('/:id/cancel', cancelDespatch);


module.exports = router;