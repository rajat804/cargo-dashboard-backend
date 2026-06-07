const mongoose = require('mongoose');

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