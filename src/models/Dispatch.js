const mongoose = require('mongoose');

const dispatchItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  unitType: { type: String, required: true },
  qty: { type: Number, default: 0 },
  issueId: { type: String, default: '' },
  issueDate: { type: String, default: '' },   // store as string "dd-mm-yyyy"
  startNo: { type: String, default: '' },
  endNo: { type: String, default: '' },
  itemSerialNo: { type: String, default: '' },
  remarks: { type: String, default: '' },
}, { _id: false });   // we don't need separate _id for subdocs

const dispatchSchema = new mongoose.Schema({
  dispatchId: { type: String, unique: true },  // e.g., "DISP/2026-27/123456"
  dispatchDate: { type: String, required: true }, // "dd-mm-yyyy"
  branchName: { type: String, required: true },
  dispatchedTo: { type: String, required: true },
  dispatchThrough: { type: String, default: '' },
  vendorGrNo: { type: String, default: '' },
  vendorGrDate: { type: String, default: '' }, // "dd-mm-yyyy"
  grBookNumber: { type: String, default: '' },
  fromLocation: { type: String, default: '' },
  toLocation: { type: String, default: '' },
  party: { type: String, default: '' },
  destination: { type: String, default: '' },
  containerDetails: { type: String, default: '' },
  isShortDocument: { type: Boolean, default: false },
  goodsType: { type: String, default: '' },
  remarks: { type: String, default: '' },
  status: { type: String, default: 'Dispatched' }, // Dispatched, In Transit, Delivered, Cancelled
  noOfItems: { type: Number, default: 0 },
  items: [dispatchItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('Dispatch', dispatchSchema);