const mongoose = require('mongoose');


// no use this models


const DespatchSchema = new mongoose.Schema(
  {
    sNo: { type: Number, required: true },
    despatchId: { type: String, required: true, unique: true },
    despatchFrom: { type: String, required: true },
    despatchedTo: { type: String, required: true },
    despatchOn: { type: String, required: true }, // date string
    courierVendor: { type: String, default: '' },
    wayBillNo: { type: String, default: '' },
    date: { type: String, required: true },
    noOfItems: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Received', 'In Transit', 'Delayed', 'Cancelled'],
      default: 'Pending',
    },
    receivedOn: { type: String, default: '' },
    receivedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Despatch', DespatchSchema);