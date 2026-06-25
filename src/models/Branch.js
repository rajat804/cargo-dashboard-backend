const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  gst: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);