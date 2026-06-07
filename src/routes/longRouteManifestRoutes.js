const express = require('express');
const router = express.Router();
const {
  createManifest,
  getManifests,
  getManifestById,
  getManifestByNo,
  updateManifest,
  updateDispatchDetails,
  cancelManifest,
  restoreManifest,
  deleteManifest,
  getManifestStats,
  getStockItems
} = require('../controllers/longRouteManifestController');

router.route('/')
  .post(createManifest)
  .get(getManifests);

router.get('/stats', getManifestStats);
router.get('/stock', getStockItems);
router.get('/manifest/:manifestNo', getManifestByNo);

router.route('/:id')
  .get(getManifestById)
  .put(updateManifest)
  .delete(deleteManifest);

router.put('/:id/dispatch', updateDispatchDetails);
router.put('/:id/cancel', cancelManifest);
router.put('/:id/restore', restoreManifest);

module.exports = router;