const mongoose = require('mongoose');

// Assigned GR Schema
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
  // New field for assigned GRs
  assignedGRs: [assignedGRSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Generate Manifest Number before save
localManifestSchema.pre('save', async function(next) {
  if (!this.manifestNo) {
    try {
      const count = await mongoose.model('LocalManifest').countDocuments();
      this.manifestNo = `I${String(count + 1).padStart(9, '0')}`;
      console.log('Generated Manifest No:', this.manifestNo);
    } catch (error) {
      console.error('Error generating manifest number:', error);
      // Fallback to timestamp based number
      this.manifestNo = `I${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('LocalManifest', localManifestSchema);