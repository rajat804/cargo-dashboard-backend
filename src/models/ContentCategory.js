const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentId: { type: Number, required: true }
});

const contentCategorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  subCategories: [subCategorySchema],
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('ContentCategory', contentCategorySchema);