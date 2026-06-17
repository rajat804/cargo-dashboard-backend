// ============================================
// src/models/GoodsArrival.js - FINAL
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
  
  // Per-GR Issue Tracking
  issueType: {
    type: String,
    enum: ['damage', 'short', 'excess', 'missing', 'none'],
    default: 'none'
  },
  damagePcs: { type: Number, default: 0 },
  short: { type: Number, default: 0 },
  excess: { type: Number, default: 0 },
  missingPcs: { type: Number, default: 0 },
  issueReason: { type: String, default: '' },
  issueDescription: { type: String, default: '' },
  
  godown: { type: String, default: '' },
  remarks: { type: String, default: '' }
}, { _id: false });

const GoodsArrivalSchema = new mongoose.Schema({
  branch: { type: String, required: true },
  selectGodown: { type: String, required: true },
  
  // ✅ NO unique: true here
  manifestNo: { type: String, required: true },
  isAutoManifest: { type: Boolean, default: true },
  
  despatchOn: { type: Date, default: Date.now },
  despatchTime: { type: String, default: '' },
  receiveDate: { type: Date, default: Date.now },
  receiveTime: { type: String, default: '' },
  
  // ✅ NO unique: true here
  serArrivalNo: { type: String, sparse: true },
  autoArrival: { type: Boolean, default: true },
  
  fromStation: { type: String, default: '' },
  modeType: { type: String, default: 'SURFACE' },
  modeName: { type: String, default: '' },
  driver: { type: String, default: '' },
  mobile: { type: String, default: '' },
  unloadingPerson: { type: String, required: true },
  
  unloadingHours: { type: Number, default: 0 },
  unloadingMinutes: { type: Number, default: 0 },
  route: { type: String, default: '' },
  tat: { type: Number, default: 0 },
  scheduleArrivalDateTime: { type: Date, default: Date.now },
  vehicleQueNo: { type: String, default: '' },
  vehicleArrivalDateTime: { type: Date, default: Date.now },
  deviation: { type: String, default: '' },
  unloadingDateTime: { type: Date, default: Date.now },
  
  sealNo: { type: String, default: '' },
  sealOk: { type: Boolean, default: true },
  dharamKantaWeight: { type: Number, default: 0 },
  
  grItems: [GRItemSchema],
  
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
    totalExcess: { type: Number, default: 0 },
    totalMissing: { type: Number, default: 0 }
  },
  
  damageType: { type: [String], enum: ['damaged', 'missing'], default: [] },
  damageReason: { type: String, default: '' },
  damageOtherRemark: { type: String, default: '' },
  damagePackageCount: { type: Number, default: 0 },
  damagePhotos: { type: [String], default: [] },
  damageRemarks: { type: String, default: '' },
  
  shortExcessType: { type: [String], enum: ['short', 'excess'], default: [] },
  shortDetails: { type: String, default: '' },
  excessDetails: { type: String, default: '' },
  
  voiceNoteUrl: { type: String, default: '' },
  voiceNoteDuration: { type: Number, default: 0 },
  
  remarks: { type: String, default: '' },
  excessReceiptWithoutGR: { type: Boolean, default: false },
  
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
  
  linkedManifestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LocalManifest' },
  
  createdBy: { type: String, default: 'SYSTEM' },
  updatedBy: { type: String, default: 'SYSTEM' }
  
}, { timestamps: true });

// ✅ Pre-save middleware
GoodsArrivalSchema.pre('save', async function(next) {
  if (this.autoArrival && !this.serArrivalNo) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    this.serArrivalNo = `ARV${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }
  
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
    totalExcess: this.grItems.reduce((sum, item) => sum + (item.excess || 0), 0),
    totalMissing: this.grItems.reduce((sum, item) => sum + (item.missingPcs || 0), 0)
  };
  
  next();
});

// ✅ INDEXES - ONLY HERE (NOT in schema)
GoodsArrivalSchema.index({ manifestNo: 1 }, { unique: true });

GoodsArrivalSchema.index({ branch: 1 });
GoodsArrivalSchema.index({ receiveDate: -1 });
GoodsArrivalSchema.index({ status: 1 });
GoodsArrivalSchema.index({ arrivalStatus: 1 });
GoodsArrivalSchema.index({ linkedManifestId: 1 });
GoodsArrivalSchema.index({ createdAt: -1 });

GoodsArrivalSchema.index({ branch: 1, receiveDate: -1 });
GoodsArrivalSchema.index({ status: 1, receiveDate: -1 });
GoodsArrivalSchema.index({ branch: 1, status: 1, receiveDate: -1 });

// ✅ Virtuals
GoodsArrivalSchema.virtual('totalIssues').get(function() {
  return this.grItems.filter(item => item.issueType !== 'none').length;
});

GoodsArrivalSchema.virtual('issueSummary').get(function() {
  const summary = { damage: 0, short: 0, excess: 0, missing: 0 };
  this.grItems.forEach(item => {
    if (item.issueType === 'damage') summary.damage++;
    else if (item.issueType === 'short') summary.short++;
    else if (item.issueType === 'excess') summary.excess++;
    else if (item.issueType === 'missing') summary.missing++;
  });
  return summary;
});

GoodsArrivalSchema.virtual('issueGRs').get(function() {
  return this.grItems
    .filter(item => item.issueType !== 'none')
    .map(item => ({
      grNo: item.grNo,
      issueType: item.issueType,
      count: item.damagePcs || item.short || item.excess || item.missingPcs || 0,
      description: item.issueDescription || ''
    }));
});

GoodsArrivalSchema.virtual('hasIssues').get(function() {
  return this.grItems.some(item => item.issueType !== 'none');
});

GoodsArrivalSchema.set('toJSON', { virtuals: true });
GoodsArrivalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GoodsArrival', GoodsArrivalSchema);