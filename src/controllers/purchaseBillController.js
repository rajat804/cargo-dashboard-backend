// controllers/purchaseBillController.js
const PurchaseBill = require('../models/PurchaseBill');
const PurchaseOrder = require('../models/PurchaseOrder');

// Helper: generate unique receipt ID
const generateReceiptId = () => {
  const now = new Date();
  const ts = now.getTime().toString().slice(-6);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RCP${ts}${rand}`;
};

// Helper: recalc totals from items
const recalcTotals = (items) => {
  let totalQty = 0, totalSubTotal = 0, totalIgst = 0, totalAmount = 0;
  items.forEach(item => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const igstP = Number(item.igstPercent) || 0;
    const sub = qty * rate;
    const igst = (sub * igstP) / 100;
    totalQty += qty;
    totalSubTotal += sub;
    totalIgst += igst;
    totalAmount += (sub + igst);
  });
  return { totalQty, totalSubTotal, totalIgst, totalAmount };
};

// ==================== CREATE ====================
exports.createPurchaseBill = async (req, res) => {
  try {
    const {
      branch, branchGst, receiptDate, storeName, vendor, vendorGst,
      vendorDepartment, subLedger, invoiceCategory, invoiceNo, invoiceDate,
      items, particulars, roundOff, finalRemarks,
      // optional fields from frontend (if sent)
      poNo, referenceNo, divisionName, tdsAmount, advanceAdjusted,
      paymentTerms, voucherNo
    } = req.body;

    // Validations
    if (!branch) return res.status(400).json({ error: 'Branch is required' });
    if (!vendor) return res.status(400).json({ error: 'Vendor is required' });
    if (!invoiceCategory) return res.status(400).json({ error: 'Invoice Category is required' });
    if (!invoiceNo) return res.status(400).json({ error: 'Invoice No. is required' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'At least one purchase item is required' });

    // Recalculate totals (override frontend values for safety)
    const { totalQty, totalSubTotal, totalIgst, totalAmount } = recalcTotals(items);

    const receiptId = generateReceiptId();

    const newBill = new PurchaseBill({
      receiptId,
      branch,
      branchGst: branchGst || '',
      receiptDate,
      storeName: storeName || '',
      vendor,
      vendorGst: vendorGst || '',
      vendorDepartment: vendorDepartment || '',
      subLedger: subLedger || '',
      invoiceCategory,
      invoiceNo,
      invoiceDate,
      items,
      particulars: particulars || [],
      roundOff: roundOff || 0,
      finalRemarks: finalRemarks || '',
      totalQty,
      totalSubTotal,
      totalIgst,
      totalAmount,
      // Set new fields with defaults / provided values
      poNo: poNo || '',
      referenceNo: referenceNo || '',
      divisionName: divisionName || '',
      tdsAmount: tdsAmount || 0,
      advanceAdjusted: advanceAdjusted || 0,
      netPayable: totalAmount, // default
      billStatus: 'Pending',
      voucherNo: voucherNo || '',
      balancePayable: totalAmount,
      paymentTerms: paymentTerms || '',
    });

    await newBill.save();
    res.status(201).json({ success: true, receiptId });
  } catch (error) {
    console.error('Create purchase bill error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// ==================== GET PENDING POs ====================
exports.getPendingPurchaseOrders = async (req, res) => {
  try {
    const { branch, vendor, asOnDate } = req.query;
    const filter = { status: 'Pending' };
    if (branch) filter.branch = branch;
    if (vendor) filter.vendor = vendor;
    if (asOnDate) {
      const date = new Date(asOnDate);
      filter.poDate = { $lte: date };
    }

    const orders = await PurchaseOrder.find(filter)
      .sort({ poDate: -1 })
      .lean();

    const formatted = orders.map((order, index) => ({
      id: order._id,
      sNo: index + 1,
      branchName: order.branch,
      vendorName: order.vendor,
      poId: order._id.toString().slice(-6),
      poNo: order.poNo,
      poDate: order.poDate.toISOString().split('T')[0],
      noOfItems: order.items.length,
      deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString().split('T')[0] : '',
      purchaseValue: order.purchaseValue,
      itemsList: order.items.map(i => i.item).join(', '),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get pending POs error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== SEARCH RECEIPTS ====================
exports.searchVendorBillReceipts = async (req, res) => {
  try {
    const { fromDate, toDate, filterOn, invoiceCategory } = req.query;

    const filter = {};

    // Date range
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filter.receiptDate = { $gte: from, $lte: to };
    }

    // Invoice category filter
    if (invoiceCategory && invoiceCategory !== '' && invoiceCategory !== 'all') {
      filter.invoiceCategory = invoiceCategory;
    }

    // Optional: handle filterOn shortcuts (but we already have date range, so we can ignore filterOn)

    const bills = await PurchaseBill.find(filter)
      .sort({ receiptDate: -1 })
      .lean();

    const formatted = bills.map((bill, index) => ({
      id: index + 1,
      sNo: index + 1,
      receiptId: bill.receiptId,
      date: bill.receiptDate.toISOString().split('T')[0],
      poNo: bill.poNo || '',
      referenceNo: bill.referenceNo || '',
      invoiceNo: bill.invoiceNo,
      invoiceCategory: bill.invoiceCategory,
      branch: bill.branch,
      divisionName: bill.divisionName || '',
      vendor: bill.vendor,
      vendorDepartment: bill.vendorDepartment || '',
      subTotal: bill.totalSubTotal || 0,
      gstAmount: bill.totalIgst || 0,
      billAmount: bill.totalAmount || 0,
      tdsAmount: bill.tdsAmount || 0,
      advanceAdjusted: bill.advanceAdjusted || 0,
      netPayable: bill.netPayable || 0,
      billStatus: bill.billStatus || 'Pending',
      voucherNo: bill.voucherNo || '',
      balancePayable: bill.balancePayable || 0,
      paymentTerms: bill.paymentTerms || '',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Search receipts error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== GET BY ID ====================
exports.getPurchaseBillById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Receipt ID is required' });
    const bill = await PurchaseBill.findOne({ receiptId: id });
    if (!bill) return res.status(404).json({ error: 'Purchase bill not found' });

    // Convert to frontend format (matches schema, so just return)
    res.json(bill);
  } catch (error) {
    console.error('Get purchase bill error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== UPDATE ====================
exports.updatePurchaseBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Receipt ID is required' });

    const updateData = req.body;

    // If items provided, recalc totals
    if (updateData.items && Array.isArray(updateData.items)) {
      const { totalQty, totalSubTotal, totalIgst, totalAmount } = recalcTotals(updateData.items);
      updateData.totalQty = totalQty;
      updateData.totalSubTotal = totalSubTotal;
      updateData.totalIgst = totalIgst;
      updateData.totalAmount = totalAmount;
      // Also update netPayable / balancePayable if not provided
      if (!updateData.netPayable) updateData.netPayable = totalAmount;
      if (!updateData.balancePayable) updateData.balancePayable = totalAmount;
    }

    const bill = await PurchaseBill.findOneAndUpdate(
      { receiptId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!bill) return res.status(404).json({ error: 'Purchase bill not found' });
    res.json(bill);
  } catch (error) {
    console.error('Update purchase bill error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== DELETE ====================
exports.deletePurchaseBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Receipt ID is required' });
    const bill = await PurchaseBill.findOneAndDelete({ receiptId: id });
    if (!bill) return res.status(404).json({ error: 'Purchase bill not found' });
    res.json({ success: true, message: 'Purchase bill deleted successfully' });
  } catch (error) {
    console.error('Delete purchase bill error:', error);
    res.status(500).json({ error: error.message });
  }
};