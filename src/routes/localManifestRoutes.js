const express = require('express');
const router = express.Router();
const {
  createManifest,
  getManifests,
  getManifestById,
  getManifestByNo,
  updateManifest,
  updateDestination,
  updateDispatchDetails,
  getStockItems,
  cancelManifest,
  restoreManifest,
  deleteManifest,
  getManifestStats
} = require('../controllers/localManifestController');

router.route('/')
  .post(createManifest)
  .get(getManifests);

router.get('/stats', getManifestStats);
router.get('/manifest/:manifestNo', getManifestByNo);
router.get('/stock', getStockItems);

router.route('/:id')
  .get(getManifestById)
  .put(updateManifest)
  .delete(deleteManifest);

router.put('/:id/update-destination', updateDestination);
router.put('/:id/dispatch', updateDispatchDetails);
router.put('/:id/cancel', cancelManifest);
router.put('/:id/restore', restoreManifest);

module.exports = router;