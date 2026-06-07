const express = require('express');
const router = express.Router();
const {
  createLHC,
  getLHCs,
  getLHCById,
  getLHCByNo,
  updateLHC,
  cancelLHC,
  restoreLHC,
  deleteLHC,
  getLHCStats,
  getPendingManifests
} = require('../controllers/lorryHireChallanController');

router.route('/')
  .post(createLHC)
  .get(getLHCs);

router.get('/stats', getLHCStats);
router.get('/pending-manifests', getPendingManifests);
router.get('/lhc/:lhcNo', getLHCByNo);

router.route('/:id')
  .get(getLHCById)
  .put(updateLHC)
  .delete(deleteLHC);

router.put('/:id/cancel', cancelLHC);
router.put('/:id/restore', restoreLHC);

module.exports = router;