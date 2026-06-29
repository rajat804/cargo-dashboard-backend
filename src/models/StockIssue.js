const mongoose = require('mongoose');

const stockIssueSchema = new mongoose.Schema({
  issueId: { type: String, unique: true, required: true },
  issueTo: { type: String, required: true },     // Branch name
  issueDate: { type: String, required: true },   // "dd-mm-yyyy"
  itemName: { type: String, required: true },
  unitType: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  startNo: { type: String, default: '' },
  endNo: { type: String, default: '' },
  status: { type: String, default: 'Issued' },   // Issued, Returned, Transferred
  remarks: { type: String, default: '' },
  createdBy: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('StockIssue', stockIssueSchema);