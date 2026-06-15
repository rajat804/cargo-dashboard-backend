// models/LocalManifest.js
const mongoose = require('mongoose');

// Assigned GR Schema - Updated with validation
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
  dispatchedPckgs: { 
    type: Number, 
    default: 0,
    validate: {
      validator: function(value) {
        return value >= 0 && value <= (this.bookedPckgs || this.stockPckgs || 0);
      },
      message: 'Dispatched packages cannot exceed booked/stock packages'
    }
  },
  weight: { type: Number, default: 0 },
  bookingType: { type: String, enum: ['computerized', 'manual'], default: 'computerized' },
  bookingId: { type: String, required: true }
}, { _id: false });

const localManifestSchema = new mongoose.Schema({
  manifestNo: { 
    type: String, 
    unique: true,
    sparse: true
  },
  date: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  time: { 
    type: String, 
    default: '' 
  },
  branch: { 
    type: String, 
    required: true 
  },
  toStation: { 
    type: String, 
    required: true 
  },
  modeName: { 
    type: String, 
    required: true 
  },
  driverName: { 
    type: String, 
    required: true 
  },
  driverMobile: { 
    type: String, 
    default: '' 
  },
  vehicleVendor: { 
    type: String, 
    default: '' 
  },
  loadingPerson: { 
    type: String, 
    required: true 
  },
  vendorCDNo: { 
    type: String, 
    default: '' 
  },
  vendorCDDate: { 
    type: Date, 
    default: Date.now 
  },
  remarks: { 
    type: String, 
    default: '' 
  },
  lhcNo: { 
    type: String, 
    default: '' 
  },
  modeCategory: { 
    type: String, 
    default: 'SURFACE' 
  },
  noOfPckgs: { 
    type: Number, 
    default: 0 
  },
  grossWeight: { 
    type: Number, 
    default: 0 
  },
  vehicleNo: { 
    type: String, 
    default: '' 
  },
  cancelledReason: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['active', 'cancelled'], 
    default: 'active' 
  },
  // FIX: Add manifestStatus field for arrival tracking
  manifestStatus: { 
    type: String, 
    enum: ['ACTIVE', 'IN_TRANSIT', 'DISPATCHED', 'ARRIVED', 'DELIVERED'],
    default: 'ACTIVE'
  },
  // FIX: Add actualArrivalDate field
  actualArrivalDate: { 
    type: Date 
  },
  // Assigned GRs
  assignedGRs: [assignedGRSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  // Reference to Goods Arrival
  goodsArrivalRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoodsArrival'
  },
}, {
  timestamps: true
});

// FIX: Manifest number generation with retry logic to avoid race conditions
localManifestSchema.pre('save', async function(next) {
  if (!this.manifestNo) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Use timestamp + random suffix for uniqueness
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const newManifestNo = `I${timestamp}${random}`.slice(0, 15); // Keep within reasonable length
        
        // Check if manifest number already exists
        const existing = await mongoose.model('LocalManifest').findOne({ manifestNo: newManifestNo });
        if (!existing) {
          this.manifestNo = newManifestNo;
          break;
        }
        attempts++;
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          // Fallback to timestamp only
          this.manifestNo = `I${Date.now()}`;
        }
      }
    }
    
    if (!this.manifestNo) {
      this.manifestNo = `I${Date.now()}`;
    }
    
    console.log('Generated Manifest No:', this.manifestNo);
  }
  next();
});

module.exports = mongoose.model('LocalManifest', localManifestSchema);