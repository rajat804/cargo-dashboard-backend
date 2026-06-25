const mongoose = require('mongoose');

const stockIssueSchema = new mongoose.Schema({
  issueId: { type: String, unique: true, required: true, index: true },
  issueTo: { type: String, required: true },
  issueDate: { type: String, required: true }, // dd-mm-yyyy
  itemName: { type: String, required: true },
  unitType: { type: String, required: true },
  startNo: { type: String, default: '' },      // ✅ optional
  endNo: { type: String, default: '' },        // ✅ optional
  quantity: { type: Number, required: true },
  status: { type: String, default: 'Issued' },
  remarks: { type: String, default: '' },
  createdBy: { type: String, default: 'ADMIN' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

stockIssueSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('StockIssue', stockIssueSchema);