const express = require('express');
// no use this despatch routes
const router = express.Router();
const {
  getAllDespatches,
  getPendingDespatches,
  receiveDespatch,
  cancelDespatch,
} = require('../controllers/despatchController');

router.get('/', getAllDespatches);
router.get('/pending', getPendingDespatches);
router.put('/receive/:id', receiveDespatch);
router.put('/cancel/:id', cancelDespatch);

module.exports = router;