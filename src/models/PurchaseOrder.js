const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poNo: { type: String, required: true, unique: true },
  poDate: { type: Date, required: true },
  branch: { type: String, required: true }, // branch name or ObjectId
  vendor: { type: String, required: true },
  items: [{ 
    item: String,
    qty: Number,
    unit: String,
    rate: Number,
  }],
  deliveryDate: { type: Date },
  purchaseValue: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Received', 'Cancelled'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);