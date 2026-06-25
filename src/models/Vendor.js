const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  gst: { type: String, default: '' },
  department: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);