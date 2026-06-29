const express = require('express');
const router = express.Router();
const {
  createPurchaseBill,
  getPendingPurchaseOrders,
  searchVendorBillReceipts,
  getPurchaseBillById,
  updatePurchaseBill,
  deletePurchaseBill,
} = require('../controllers/purchaseBillController');

router.post('/', createPurchaseBill);
router.get('/pending-pos', getPendingPurchaseOrders);
router.get('/receipts', searchVendorBillReceipts);
router.get('/:id', getPurchaseBillById);
router.put('/:id', updatePurchaseBill);
router.delete('/:id', deletePurchaseBill);

module.exports = router;