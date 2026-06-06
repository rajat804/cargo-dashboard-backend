const mongoose = require('mongoose');

const goodsItemSchema = new mongoose.Schema({
  noOfPckgs: { type: Number, required: true, default: 0 },
  contentCategory: { type: String, default: '' },
  contentSubCategory: { type: String, default: '' },
  content: { type: String, default: '' },
  packing: { type: String, required: true, default: 'BOX' },
  actualWeight: { type: Number, default: 0 },
  chargeWeight: { type: Number, default: 0 },
  isWeightValid: { type: Boolean, default: true },
  weightError: { type: String, default: '' }
});

const invoiceItemSchema = new mongoose.Schema({
  invoiceNo: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  value: { type: String, default: '0' },
  ewayBillNo: { type: String, default: '' },
  ewayBillDate: { type: Date, default: Date.now },
  validUpto: { type: String, default: '' }
});

const extraChargeSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 }
});

const bookingSchema = new mongoose.Schema({
  grNo: { type: String, required: true, unique: true },
  bookingFrom: { type: String, required: true },
  bookingDate: { type: Date, required: true, default: Date.now },
  destination: { type: String, required: true },
  pickupFrom: { type: String, default: '' },
  deliveryPoint: { type: String, default: '' },
  bookingType: { type: String, required: true },
  collectionAt: { type: String, required: true },
  
  // Consignor Details
  consignorId: { type: String, default: '' },
  consignorName: { type: String, required: true },
  consignorGst: { type: String, default: '' },
  consignorAdhaar: { type: String, default: '' },
  consignorPan: { type: String, default: '' },
  consignorMobile: { type: String, default: '' },
  consignorEmail: { type: String, default: '' },
  consignorDealerCode: { type: String, default: '' },
  consignorAddress: { type: String, default: '' },
  consignorCity: { type: String, default: '' },
  consignorState: { type: String, default: '' },
  consignorIec: { type: String, default: '' },
  consignorBankAd: { type: String, default: '' },
  
  // Consignee Details
  consigneeId: { type: String, default: '' },
  consigneeName: { type: String, required: true },
  consigneeGst: { type: String, default: '' },
  consigneeAdhaar: { type: String, default: '' },
  consigneePan: { type: String, default: '' },
  consigneeMobile: { type: String, default: '' },
  consigneeEmail: { type: String, default: '' },
  consigneeDealerCode: { type: String, default: '' },
  consigneeAddress: { type: String, default: '' },
  consigneeCity: { type: String, default: '' },
  consigneeState: { type: String, default: '' },
  consigneeIec: { type: String, default: '' },
  consigneeEximCode: { type: String, default: '' },
  
  // Other Details
  pvtMarkaSealNo: { type: String, default: '' },
  serviceProduct: { type: String, required: true },
  deliveryType: { type: String, required: true },
  loadType: { type: String, required: true },
  mkExecutive: { type: String, default: '' },
  freightOn: { type: String, default: 'CHARGE WEIGHT' },
  manualRates: { type: Boolean, default: false },
  ncv: { type: Boolean, default: false },
  printAfterSave: { type: Boolean, default: false },
  ccAttached: { type: Boolean, default: false },
  
  // Totals
  totalPckgs: { type: Number, default: 0 },
  totalActualWeight: { type: Number, default: 0 },
  totalChargeWeight: { type: Number, default: 0 },
  totalFreight: { type: Number, default: 0 },
  
  // Remarks
  remarks: { type: String, default: '' },
  roRemarks: { type: String, default: '' },
  gpRemarks: { type: String, default: '' },
  billNo: { type: String, default: '' },
  supplementaryBillNo: { type: String, default: '' },
  
  // Insurance
  insuranceCoveredBy: { type: String, default: '' },
  insuranceNo: { type: String, default: '' },
  insuranceDate: { type: Date, default: Date.now },
  insuranceCompany: { type: String, default: '' },
  
  // Arrays
  goodsItems: [goodsItemSchema],
  invoices: [invoiceItemSchema],
  
  // NEW FIELDS FOR FREIGHT CALCULATION
  freightRate: { type: Number, default: 0 },
  extraCharges: [extraChargeSchema],
  gstPaidBy: { type: String, default: 'CONSIGNEE' },
  gstRate: { type: Number, default: 0 },
  advanceAmount: { type: Number, default: 0 },
  subTotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  
  // Status
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  cancelledDate: { type: Date },
  cancelledReason: { type: String },
  
  // POD (Proof of Delivery)
  podEntry: { type: String, default: '' },
  podUploaded: { type: Boolean, default: false },
  podUrl: { type: String, default: '' },
  podUploadedAt: { type: Date },
  
  // Detention
  detentionDays: { type: Number, default: 0 },
  detentionAmount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Generate GR Number before save
bookingSchema.pre('save', async function(next) {
  if (!this.grNo) {
    const count = await mongoose.model('Booking').countDocuments();
    this.grNo = `GR${String(count + 1).padStart(6, '0')}`;
    console.log('Generated GR No:', this.grNo);
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);