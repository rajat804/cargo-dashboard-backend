const mongoose = require('mongoose');

const grSequenceSchema = new mongoose.Schema({
  branch: { type: String, required: true, unique: true },
  prefix: { type: String, required: true },    // e.g., "KH", "CC"
  currentNumber: { type: Number, default: 1 }, // 1 to 50
  maxLimit: { type: Number, default: 50 },
}, { timestamps: true });

module.exports = mongoose.model('GrSequence', grSequenceSchema);