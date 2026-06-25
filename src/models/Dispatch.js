const mongoose = require('mongoose');

const dispatchItemSchema = new mongoose.Schema({
  sNo: Number,
  itemName: String,
  unitType: String,
  qty: Number,
  issueId: String,
  issueDate: String,
  startNo: String,
  endNo: String,
  itemSerialNo: String,
  remarks: String,
});

const dispatchSchema = new mongoose.Schema({
  dispatchDate: String,
  branchName: String,
  dispatchedTo: String,
  dispatchThrough: String,
  vendorGrNo: String,
  vendorGrDate: String,
  dispatchId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  noOfItems: Number,
  status: {
    type: String,
    enum: ['Dispatched', 'In Transit', 'Delivered', 'Cancelled', 'Received'],
    default: 'Dispatched',
  },
  items: [dispatchItemSchema],
  remarks: String,
  // === NEW FIELDS FOR RECEIVE ===
  receivedOn: { type: String, default: '' },
  receivedBy: { type: String, default: '' },
  // =============================
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

dispatchSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Dispatch', dispatchSchema);