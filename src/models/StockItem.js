const mongoose = require('mongoose');
const stockItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, unique: true },
  unitType: { type: String, required: true },
  openingStock: { type: Number, default: 0 },
  blocked: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model('StockItem', stockItemSchema);