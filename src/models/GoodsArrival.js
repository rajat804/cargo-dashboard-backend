// models/GoodsArrival.js
const mongoose = require('mongoose');

const grItemSchema = new mongoose.Schema({
  grNo: { type: String, required: true },
  grDate: { type: Date, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  consignor: { type: String },
  consignee: { type: String },
  cargoType: { type: String, enum: ['General', 'Fragile', 'Hazardous', 'Perishable', 'Liquid'] },
  despPckgs: { type: Number, default: 0 },
  despWt: { type: Number, default: 0 },
  receivePckgs: { type: Number, default: 0 },
  receiveWt: { type: Number, default: 0 },
  damagePcs: { type: Number, default: 0 },
  damageReason: { type: String },
  short: { type: Number, default: 0 },
  excess: { type: Number, default: 0 },
  godown: { type: String },
  remarks: { type: String }
});

const damageClaimSchema = new mongoose.Schema({
  grNo: { type: String },
  despatchPckgs: { type: Number, default: 0 },
  despatchWeight: { type: Number, default: 0 },
  receivedPckgs: { type: Number, default: 0 },
  receivedWeight: { type: Number, default: 0 },
  damagePckgs: { type: Number, default: 0 },
  claimAmt: { type: Number, default: 0 },
  damageReason: { type: String },
  uploadDocument: { type: String },
  documentFile: { type: String }
});

const goodsArrivalSchema = new mongoose.Schema({
  branch: { type: String, required: true },
  selectGodown: { type: String, required: true },
  manifestNo: { type: String, required: true, unique: true },
  despatchOn: { type: Date, required: true },
  despatchTime: { type: String },
  fromStation: { type: String, required: true },
  modeType: { type: String, enum: ['SURFACE', 'AIR', 'RAIL', 'SEA'] },
  modeName: { type: String },
  driver: { type: String },
  mobile: { type: String },
  unloadingPerson: { type: String, required: true },
  serArrivalNo: { type: String },
  autoArrival: { type: Boolean, default: true },
  receiveDate: { type: Date, required: true },
  receiveTime: { type: String },
  unloadingHours: { type: Number, default: 0 },
  unloadingMinutes: { type: Number, default: 0 },
  route: { type: String },
  tat: { type: Number, default: 0 },
  scheduleArrivalDateTime: { type: Date },
  vehicleQueNo: { type: String },
  vehicleArrivalDateTime: { type: Date },
  deviation: { type: String },
  unloadingDateTime: { type: Date },
  sealNo: { type: String },
  sealOk: { type: Boolean, default: true },
  dharamKantaWeight: { type: Number, default: 0 },
  remarks: { type: String },
  excessReceiptWithoutGR: { type: Boolean, default: false },
  grItems: [grItemSchema],
  damageClaims: [damageClaimSchema],
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
  arrivalStatus: { 
    type: String, 
    enum: ['PENDING', 'ARRIVED', 'COMPLETED', 'CANCELLED'],
    default: 'ARRIVED'
  },
  linkedManifest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LocalManifest',
    required: true
  },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to calculate totals
goodsArrivalSchema.pre('save', function(next) {
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

module.exports = mongoose.model('GoodsArrival', goodsArrivalSchema);