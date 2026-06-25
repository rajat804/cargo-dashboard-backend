const PurchaseBill = require("../models/PurchaseBill");

exports.getStockRegister = async (req, res) => {
  try {
    const { item } = req.query;

    let filter = {};

    // Filter by item if provided
    if (item && item !== "ALL") {
      filter["items.item"] = item;
    }

    const bills = await PurchaseBill.find(filter)
      .select("items")
      .lean();   // Faster response

    const stockMap = {};

    bills.forEach((bill) => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach((i) => {
          const itemName = i.item || i.name;   // Handle both cases
          if (!itemName) return;

          if (!stockMap[itemName]) {
            stockMap[itemName] = {
              id: Object.keys(stockMap).length + 1,
              sNo: Object.keys(stockMap).length + 1,
              itemName: itemName,
              unitType: i.unitType || "PCS",
              openingStock: 0,
              purchased: 0,
              issued: 0,
              blocked: 0,
              stockInHand: 0,
            };
          }

          const qty = Number(i.qty) || 0;
          stockMap[itemName].purchased += qty;
          stockMap[itemName].stockInHand += qty;
        });
      }
    });

    const result = Object.values(stockMap);

    console.log(`✅ Stock Register: ${result.length} items found`);

    res.json(result);
  } catch (error) {
    console.error("Stock Register Error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};