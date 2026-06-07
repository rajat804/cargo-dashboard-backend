const mongoose = require('mongoose');

const longRouteManifestSchema = new mongoose.Schema({
  manifestNo: { 
    type: String, 
    unique: true,
    sparse: true
  },
  manifestDateTime: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  manifestTime: { 
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
  deliveryLocation: { 
    type: String, 
    default: '' 
  },
  vehicleType: { 
    type: String, 
    default: '' 
  },
  vendor: { 
    type: String, 
    default: '' 
  },
  vehicleNo: { 
    type: String, 
    required: true 
  },
  capacity: { 
    type: String, 
    default: '' 
  },
  driver: { 
    type: String, 
    required: true 
  },
  mobileNo: { 
    type: String, 
    default: '' 
  },
  consolidatedEwaybillNo: { 
    type: String, 
    default: '' 
  },
  ewaybillDate: { 
    type: Date, 
    default: Date.now 
  },
  loadedBy: { 
    type: String, 
    required: true 
  },
  estimateArrivalAtDestination: { 
    type: String, 
    default: '' 
  },
  remarks: { 
    type: String, 
    default: '' 
  },
  type: { 
    type: String, 
    default: 'LONG ROUTE' 
  },
  fromStation: { 
    type: String, 
    default: '' 
  },
  arrivalAt: { 
    type: String, 
    default: '' 
  },
  category: { 
    type: String, 
    default: '' 
  },
  dispatchedPckgs: { 
    type: Number, 
    default: 0 
  },
  dispatchedWt: { 
    type: Number, 
    default: 0 
  },
  lhcNo: { 
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
longRouteManifestSchema.pre('save', async function(next) {
  if (!this.manifestNo) {
    try {
      const count = await mongoose.model('LongRouteManifest').countDocuments();
      this.manifestNo = `LR${String(count + 1).padStart(6, '0')}`;
      console.log('Generated Manifest No:', this.manifestNo);
    } catch (error) {
      console.error('Error generating manifest number:', error);
      this.manifestNo = `LR${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('LongRouteManifest', longRouteManifestSchema);