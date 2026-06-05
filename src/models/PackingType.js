const mongoose = require('mongoose');

const packingTypeSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  minWeight: { type: Number, default: 0 },
  maxWeight: { type: Number, required: true },
  defaultWeight: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('PackingType', packingTypeSchema);