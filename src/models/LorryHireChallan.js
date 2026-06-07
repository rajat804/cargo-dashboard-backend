const mongoose = require('mongoose');

const lorryChallanItemSchema = new mongoose.Schema({
  challanNo: { type: String, default: '' },
  challanDate: { type: Date, default: Date.now },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
  pckgs: { type: Number, default: 0 },
  actualWeight: { type: Number, default: 0 },
  chargeableWeight: { type: Number, default: 0 },
  ftl: { type: String, default: '' },
  perKgPckgs: { type: String, default: '' },
  rate: { type: Number, default: 0 },
  calcAmount: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  remarks: { type: String, default: '' }
});

const additionalChargeSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['add', 'subtract'], default: 'add' },
  amount: { type: Number, default: 0 },
  tdsApplicable: { type: Boolean, default: false },
  advance: { type: Number, default: 0 },
  hasChecklist: { type: Boolean, default: false }
});

const balancePayableBranchSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  branch: { type: String, default: '' },
  amount: { type: Number, default: 0 }
});

const lorryHireChallanSchema = new mongoose.Schema({
  lhcNo: { 
    type: String, 
    unique: true,
    sparse: true
  },
  branchName: { 
    type: String, 
    required: true 
  },
  despatchType: { 
    type: String, 
    default: '' 
  },
  date: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  modeType: { 
    type: String, 
    default: '' 
  },
  modeName: { 
    type: String, 
    default: '' 
  },
  owner: { 
    type: String, 
    default: '' 
  },
  vendor: { 
    type: String, 
    default: '' 
  },
  vehicleType: { 
    type: String, 
    default: '' 
  },
  broker: { 
    type: String, 
    default: '' 
  },
  route: { 
    type: String, 
    default: '' 
  },
  pan: { 
    type: String, 
    default: '' 
  },
  emptyLorryWeight: { 
    type: Number, 
    default: 0 
  },
  dharamKantaWeight: { 
    type: Number, 
    default: 0 
  },
  remarks: { 
    type: String, 
    default: '' 
  },
  hireFreight: { 
    type: Number, 
    default: 0 
  },
  items: [lorryChallanItemSchema],
  
  // New fields for additional charges
  additionalCharges: [additionalChargeSchema],
  balancePayableBranches: [balancePayableBranchSchema],
  
  // TDS and Advance fields
  tdsType: { 
    type: String, 
    enum: ['EXEMPTED', 'NON-EXEMPTED', 'PARTIAL'],
    default: 'EXEMPTED' 
  },
  tdsPercentage: { 
    type: Number, 
    default: 0 
  },
  applicableOn: { 
    type: Number, 
    default: 0 
  },
  lessTds: { 
    type: Number, 
    default: 0 
  },
  cashAdvance: { 
    type: Number, 
    default: 0 
  },
  bankAdvance: { 
    type: Number, 
    default: 0 
  },
  petroCardAdvance: { 
    type: Number, 
    default: 0 
  },
  guaranteeWeight: { 
    type: Number, 
    default: 0 
  },
  lhcNotForPayment: { 
    type: Boolean, 
    default: false 
  },
  issueFuelSlip: { 
    type: Boolean, 
    default: false 
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

// Generate LHC Number before save
lorryHireChallanSchema.pre('save', async function(next) {
  if (!this.lhcNo) {
    try {
      const count = await mongoose.model('LorryHireChallan').countDocuments();
      this.lhcNo = `LHC${String(count + 1).padStart(6, '0')}`;
      console.log('Generated LHC No:', this.lhcNo);
    } catch (error) {
      console.error('Error generating LHC number:', error);
      this.lhcNo = `LHC${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('LorryHireChallan', lorryHireChallanSchema);