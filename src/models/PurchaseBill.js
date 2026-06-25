const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  unitType: { type: String, required: true },
  qty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  subTotal: { type: Number, default: 0 },
  igstPercent: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  startNo: { type: String, default: '' },
  endNo: { type: String, default: '' },
  qualityChecked: { type: Boolean, default: false },
  remarks: { type: String, default: '' },
});

const particularSchema = new mongoose.Schema({
  particulars: { type: String, required: true },
  sign: { type: String, enum: ['+', '-'], default: '+' },
  percent: { type: Number, default: 0 },
  applicable: { type: Boolean, default: true },
  amount: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
});

const purchaseBillSchema = new mongoose.Schema({
  receiptId: { type: String, unique: true },
  branch: { type: String, required: true },
  branchGst: { type: String, default: '' },
  receiptDate: { type: Date, required: true },
  storeName: { type: String, default: '' },
  vendor: { type: String, required: true },
  vendorGst: { type: String, default: '' },
  vendorDepartment: { type: String, default: '' },
  subLedger: { type: String, default: '' },
  invoiceCategory: { type: String, required: true },
  invoiceNo: { type: String, required: true },
  invoiceDate: { type: Date, required: true },
  items: [purchaseItemSchema],
  particulars: [particularSchema],
  roundOff: { type: Number, default: 0 },
  finalRemarks: { type: String, default: '' },
  // Aggregated totals (optional but convenient)
  totalQty: { type: Number, default: 0 },
  totalSubTotal: { type: Number, default: 0 },
  totalIgst: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseBill', purchaseBillSchema);