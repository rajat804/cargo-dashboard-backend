// ============================================
// src/models/GoodsArrival.js 
// ============================================
const mongoose = require('mongoose');

const GRItemSchema = new mongoose.Schema({
  grNo: { type: String, required: true },
  grDate: { type: Date, default: Date.now },
  origin: { type: String, default: '' },
  destination: { type: String, default: '' },
  consignor: { type: String, default: '' },
  consignee: { type: String, default: '' },
  despPckgs: { type: Number, default: 0 },
  despWt: { type: Number, default: 0 },
  receivePckgs: { type: Number, default: 0 },
  receiveWt: { type: Number, default: 0 },
  damagePcs: { type: Number, default: 0 },
  short: { type: Number, default: 0 },
  excess: { type: Number, default: 0 },
  godown: { type: String, default: '' },
  remarks: { type: String, default: '' }
});

const GoodsArrivalSchema = new mongoose.Schema({
  // Basic Information
  branch: { type: String, required: true },
  selectGodown: { type: String, required: true },
  manifestNo: { type: String, required: true, unique: true },
  isAutoManifest: { type: Boolean, default: true },
  
  // Dates
  despatchOn: { type: Date, default: Date.now },
  despatchTime: { type: String, default: '' },
  receiveDate: { type: Date, default: Date.now },
  receiveTime: { type: String, default: '' },
  serArrivalNo: { type: String, unique: true, sparse: true },
  autoArrival: { type: Boolean, default: true },
  
  // Transport Details
  fromStation: { type: String, default: '' },
  modeType: { type: String, default: 'SURFACE' },
  modeName: { type: String, default: '' },
  driver: { type: String, default: '' },
  mobile: { type: String, default: '' },
  unloadingPerson: { type: String, required: true },
  
  // Timing
  unloadingHours: { type: Number, default: 0 },
  unloadingMinutes: { type: Number, default: 0 },
  route: { type: String, default: '' },
  tat: { type: Number, default: 0 },
  scheduleArrivalDateTime: { type: Date, default: Date.now },
  vehicleQueNo: { type: String, default: '' },
  vehicleArrivalDateTime: { type: Date, default: Date.now },
  deviation: { type: String, default: '' },
  unloadingDateTime: { type: Date, default: Date.now },
  
  // Seal
  sealNo: { type: String, default: '' },
  sealOk: { type: Boolean, default: true },
  dharamKantaWeight: { type: Number, default: 0 },
  
  // GR Items
  grItems: [GRItemSchema],
  
  // Totals
  manifestTotals: {
    noOfGR: { type: Number, default: 0 },
    totalPckgs: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 }
  },
  arrivalTotals: {
    noOfGR: { type: Number, default: 0 },
    totalPckgs: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 },
    damagePckgs: { type: Number, default: 0 },
    totalShort: { type: Number, default: 0 },
    totalExcess: { type: Number, default: 0 }
  },
  
  // Damage/Missing
  damageType: {
    type: [String],
    enum: ['damaged', 'missing'],
    default: []
  },
  damageReason: { type: String, default: '' },
  damageOtherRemark: { type: String, default: '' },
  damagePackageCount: { type: Number, default: 0 },
  damagePhotos: { type: [String], default: [] },
  damageRemarks: { type: String, default: '' },
  
  // Short/Excess
  shortExcessType: {
    type: [String],
    enum: ['short', 'excess'],
    default: []
  },
  shortDetails: { type: String, default: '' },
  excessDetails: { type: String, default: '' },
  
  // Voice Note
  voiceNoteUrl: { type: String, default: '' },
  voiceNoteDuration: { type: Number, default: 0 },
  
  // General
  remarks: { type: String, default: '' },
  excessReceiptWithoutGR: { type: Boolean, default: false },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  },
  arrivalStatus: {
    type: String,
    enum: ['PENDING', 'ARRIVED', 'COMPLETED', 'CANCELLED'],
    default: 'ARRIVED'
  },
  cancelledReason: { type: String, default: '' },
  
  // Relationships
  linkedManifestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LocalManifest' },
  
  // Audit
  createdBy: { type: String, default: 'SYSTEM' },
  updatedBy: { type: String, default: 'SYSTEM' }
}, { timestamps: true });

// ✅ Pre-save middleware
GoodsArrivalSchema.pre('save', async function(next) {
  // Generate serial arrival number if auto
  if (this.autoArrival && !this.serArrivalNo) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    this.serArrivalNo = `ARV${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate totals
  this.manifestTotals = {
    noOfGR: this.grItems.length,
    totalPckgs: this.grItems.reduce((sum, item) => sum + (item.despPckgs || 0), 0),
    totalWeight: this.grItems.reduce((sum, item) => sum + (item.despWt || 0), 0)
  };
  
  this.arrivalTotals = {
    noOfGR: this.grItems.length,
    totalPckgs: this.grItems.reduce((sum, item) => sum + (item.receivePckgs || 0), 0),
    totalWeight: this.grItems.reduce((sum, item) => sum + (item.receiveWt || 0), 0),
    damagePckgs: this.grItems.reduce((sum, item) => sum + (item.damagePcs || 0), 0),
    totalShort: this.grItems.reduce((sum, item) => sum + (item.short || 0), 0),
    totalExcess: this.grItems.reduce((sum, item) => sum + (item.excess || 0), 0)
  };
  
  next();
});

// ✅ Indexes - For better query performance (NO DUPLICATES)
GoodsArrivalSchema.index({ branch: 1 });
GoodsArrivalSchema.index({ receiveDate: -1 });
GoodsArrivalSchema.index({ status: 1 });
GoodsArrivalSchema.index({ arrivalStatus: 1 });
GoodsArrivalSchema.index({ linkedManifestId: 1 });

// ✅ Compound indexes for common filters
GoodsArrivalSchema.index({ branch: 1, receiveDate: -1 });
GoodsArrivalSchema.index({ status: 1, receiveDate: -1 });

module.exports = mongoose.model('GoodsArrival', GoodsArrivalSchema);