const PurchaseBill = require('../models/PurchaseBill');
const Dispatch = require('../models/Dispatch');
const StockItem = require('../models/StockItem');
const StockIssue = require('../models/StockIssue'); // 🆕 ADD THIS

// Helper: Format date
const formatDateToString = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

exports.getStockRegister = async (req, res) => {
  try {
    const { item, asOnDate } = req.query;

    const targetDate = asOnDate ? new Date(asOnDate) : new Date();
    targetDate.setHours(23, 59, 59, 999);
    const dateStr = formatDateToString(targetDate);

    // 1️⃣ Fetch Purchase Bills (INWARD)
    let purchaseFilter = { receiptDate: { $lte: targetDate } };
    if (item && item !== 'ALL') {
      purchaseFilter['items.item'] = item;
    }
    const bills = await PurchaseBill.find(purchaseFilter).select('items').lean();

    // 2️⃣ Fetch Dispatches (OUTWARD - External) - EXCLUDE CANCELLED
    let dispatchFilter = {
      dispatchDate: { $lte: dateStr },
      status: { $ne: 'Cancelled' }
    };
    if (item && item !== 'ALL') {
      dispatchFilter['items.itemName'] = item;
    }
    const dispatches = await Dispatch.find(dispatchFilter).select('items').lean();

    // 3️⃣ 🆕 Fetch Stock Issues (OUTWARD - Internal from Booking) - EXCLUDE RETURNED
    let issueFilter = {
      issueDate: { $lte: dateStr },
      status: { $ne: 'Returned' }
    };
    if (item && item !== 'ALL') {
      issueFilter.itemName = item;
    }
    const stockIssues = await StockIssue.find(issueFilter).select('itemName unitType quantity').lean();

    // 4️⃣ Fetch Opening Stock & Blocked
    let stockItemFilter = {};
    if (item && item !== 'ALL') {
      stockItemFilter.itemName = item;
    }
    const stockItems = await StockItem.find(stockItemFilter).lean();
    const stockItemMap = {};
    stockItems.forEach(si => {
      stockItemMap[si.itemName] = si;
    });

    // 5️⃣ Aggregate Data
    const stockMap = {};

    // --- Process Purchases (IN) ---
    bills.forEach((bill) => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach((i) => {
          const itemName = i.item || i.name;
          if (!itemName) return;

          if (!stockMap[itemName]) {
            stockMap[itemName] = {
              itemName,
              unitType: i.unitType || 'PCS',
              openingStock: 0,
              purchased: 0,
              issued: 0,
              blocked: 0,
            };
          }
          stockMap[itemName].purchased += Number(i.qty) || 0;
        });
      }
    });

    // --- Process Dispatches (OUT - External) ---
    dispatches.forEach((dispatch) => {
      if (dispatch.items && Array.isArray(dispatch.items)) {
        dispatch.items.forEach((i) => {
          const itemName = i.itemName;
          if (!itemName) return;

          if (!stockMap[itemName]) {
            stockMap[itemName] = {
              itemName,
              unitType: i.unitType || 'PCS',
              openingStock: 0,
              purchased: 0,
              issued: 0,
              blocked: 0,
            };
          }
          stockMap[itemName].issued += Number(i.qty) || 0;
        });
      }
    });

    // 🆕 --- Process Stock Issues (OUT - Internal from Booking) ---
    stockIssues.forEach((issue) => {
      const itemName = issue.itemName;
      if (!itemName) return;

      if (!stockMap[itemName]) {
        stockMap[itemName] = {
          itemName,
          unitType: issue.unitType || 'PCS',
          openingStock: 0,
          purchased: 0,
          issued: 0,
          blocked: 0,
        };
      }
      stockMap[itemName].issued += Number(issue.quantity) || 0;
    });

    // --- Merge Opening Stock & Blocked ---
    Object.keys(stockMap).forEach((key) => {
      const master = stockItemMap[key];
      if (master) {
        stockMap[key].openingStock = master.openingStock || 0;
        stockMap[key].blocked = master.blocked || 0;
      }
    });

    // 6️⃣ Calculate Final Stock In Hand
    const result = Object.values(stockMap).map((item, index) => {
      const stockInHand =
        item.openingStock +
        item.purchased -
        item.issued -
        item.blocked;

      return {
        id: index + 1,
        sNo: index + 1,
        ...item,
        stockInHand: stockInHand,
      };
    });

    result.sort((a, b) => a.itemName.localeCompare(b.itemName));

    console.log(`✅ Stock Register: ${result.length} items found as on ${dateStr}`);

    res.json(result);
  } catch (error) {
    console.error('Stock Register Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};