// ============================================
// src/models/LocalManifest.js (Your existing file - keeping as is)
// ============================================
const mongoose = require('mongoose');

const assignedGRSchema = new mongoose.Schema({
  id: { type: String, required: true },
  grNo: { type: String, required: true },
  grDate: { type: Date, required: true },
  consignor: { type: String, required: true },
  consignee: { type: String, required: true },
  destination: { type: String, required: true },
  toPay: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  tbb: { type: Number, default: 0 },
  bookedPckgs: { type: Number, default: 0 },
  stockPckgs: { type: Number, default: 0 },
  dispatchedPckgs: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  bookingType: { type: String, enum: ['computerized', 'manual'], default: 'computerized' },
  bookingId: { type: String, required: true }
}, { _id: false });

const localManifestSchema = new mongoose.Schema({
  manifestNo: { type: String, unique: true, sparse: true },
  date: { type: Date, required: true, default: Date.now },
  time: { type: String, default: '' },
  branch: { type: String, required: true },
  toStation: { type: String, required: true },
  modeName: { type: String, required: true },
  driverName: { type: String, required: true },
  driverMobile: { type: String, default: '' },
  vehicleVendor: { type: String, default: '' },
  loadingPerson: { type: String, required: true },
  vendorCDNo: { type: String, default: '' },
  vendorCDDate: { type: Date, default: Date.now },
  remarks: { type: String, default: '' },
  lhcNo: { type: String, default: '' },
  modeCategory: { type: String, default: 'SURFACE' },
  noOfPckgs: { type: Number, default: 0 },
  grossWeight: { type: Number, default: 0 },
  vehicleNo: { type: String, default: '' },
  cancelledReason: { type: String, default: '' },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  manifestStatus: { 
    type: String, 
    enum: ['ACTIVE', 'IN_TRANSIT', 'DISPATCHED', 'ARRIVED', 'DELIVERED'],
    default: 'ACTIVE'
  },
  actualArrivalDate: { type: Date },
  assignedGRs: [assignedGRSchema],
  goodsArrivalRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoodsArrival'
  },
}, { timestamps: true });

// Manifest number generation with retry logic
localManifestSchema.pre('save', async function(next) {
  if (!this.manifestNo) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const newManifestNo = `I${timestamp}${random}`.slice(0, 15);
        
        const existing = await mongoose.model('LocalManifest').findOne({ manifestNo: newManifestNo });
        if (!existing) {
          this.manifestNo = newManifestNo;
          break;
        }
        attempts++;
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          this.manifestNo = `I${Date.now()}`;
        }
      }
    }
    
    if (!this.manifestNo) {
      this.manifestNo = `I${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('LocalManifest', localManifestSchema);