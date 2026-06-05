const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstNumber: { type: String, unique: true, sparse: true },
  adhaarNumber: { type: String, unique: true, sparse: true },
  panNumber: { type: String, unique: true, sparse: true },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  mobile: { type: String, required: true },
  email: { type: String, default: '' },
  dealerCode: { type: String, default: '' },
  iecCode: { type: String, default: '' },
  bankAdNo: { type: String, default: '' },
  clientType: { type: String, enum: ['consignor', 'consignee', 'both'], default: 'both' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create indexes for faster search
clientSchema.index({ gstNumber: 1 });
clientSchema.index({ adhaarNumber: 1 });
clientSchema.index({ panNumber: 1 });
clientSchema.index({ mobile: 1 });
clientSchema.index({ name: 1 });

module.exports = mongoose.model('Client', clientSchema);