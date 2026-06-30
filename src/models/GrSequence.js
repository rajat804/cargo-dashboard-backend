const mongoose = require('mongoose');

const grSequenceSchema = new mongoose.Schema({
  branch: { type: String, required: true, unique: true },
  prefix: { type: String, required: true },
  currentNumber: { type: Number, default: 1 },
  maxLimit: { type: Number, default: 50 },
}, { timestamps: true });

module.exports = mongoose.model('GrSequence', grSequenceSchema);