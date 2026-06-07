const express = require('express');
const router = express.Router();

// Static data (no database needed)
const contentCategories = [
  {
    id: 1, name: "Electrical Goods",
    subCategories: [
      { id: 11, name: "Fan", parentId: 1 },
      { id: 12, name: "Switch Boards", parentId: 1 },
      { id: 13, name: "Wires", parentId: 1 },
      { id: 14, name: "Light/LED", parentId: 1 },
    ]
  },
  {
    id: 2, name: "Electronics",
    subCategories: [
      { id: 21, name: "Mobile Phones", parentId: 2 },
      { id: 22, name: "Laptops", parentId: 2 },
      { id: 23, name: "TV/Monitors", parentId: 2 },
    ]
  },
  {
    id: 3, name: "Automobile Parts",
    subCategories: [
      { id: 31, name: "Engine Parts", parentId: 3 },
      { id: 32, name: "Tyres", parentId: 3 },
      { id: 33, name: "Batteries", parentId: 3 },
    ]
  },
  {
    id: 4, name: "Chemicals/Paints",
    subCategories: [
      { id: 41, name: "Industrial Chemicals", parentId: 4 },
      { id: 42, name: "Paints", parentId: 4 },
    ]
  },
  {
    id: 5, name: "Textiles/Clothes",
    subCategories: [
      { id: 51, name: "Readymade Garments", parentId: 5 },
      { id: 52, name: "Fabrics", parentId: 5 },
    ]
  },
  {
    id: 6, name: "General Cargo",
    subCategories: [
      { id: 61, name: "General Goods", parentId: 6 },
      { id: 62, name: "Consumer Goods", parentId: 6 },
    ]
  },
];

const packingTypes = [
  { id: 1, name: "BOX", minWeight: 0, maxWeight: 30, defaultWeight: 0 },
  { id: 2, name: "CARTON", minWeight: 0, maxWeight: 50, defaultWeight: 0 },
  { id: 3, name: "WOODEN BOX", minWeight: 0, maxWeight: 40, defaultWeight: 0 },
  { id: 4, name: "PALLET", minWeight: 0, maxWeight: 200, defaultWeight: 0 },
  { id: 5, name: "BAG", minWeight: 0, maxWeight: 50, defaultWeight: 0 },
  { id: 6, name: "BORI", minWeight: 0, maxWeight: 60, defaultWeight: 0 },
  { id: 7, name: "BORA", minWeight: 0, maxWeight: 80, defaultWeight: 0 },
  { id: 8, name: "DRUM", minWeight: 0, maxWeight: 200, defaultWeight: 0 },
  { id: 9, name: "LOOSE", minWeight: 0, maxWeight: 1000, defaultWeight: 0 },
];

const branches = [
  "DELHI", "MUMBAI", "BANGALORE", "CHENNAI", "KOLKATA", 
  "AHMEDABAD", "PUNE", "HYDERABAD", "LUCKNOW", "JAIPUR"
];

// Get content categories
router.get('/content-categories', (req, res) => {
  res.status(200).json({
    success: true,
    data: contentCategories
  });
});

// Get packing types
router.get('/packing-types', (req, res) => {
  res.status(200).json({
    success: true,
    data: packingTypes
  });
});

// Get branches
router.get('/branches', (req, res) => {
  res.status(200).json({
    success: true,
    data: branches
  });
});

// Add these to your existing staticRoutes.js

// Branch options
router.get('/branches', (req, res) => {
  res.status(200).json({
    success: true,
    data: ["JAMNA BAZAR", "WAZIRPUR", "MANGOLPURI", "ZAKHIRA", "NEW LAJPAT RAI MARKET", "CORPORATE OFFICE", "DELHI", "MUMBAI"]
  });
});

// To Station options
router.get('/to-stations', (req, res) => {
  res.status(200).json({
    success: true,
    data: ["U P BORDER A JH UP", "U P BORDER D BR GP", "U P BORDER B BR", "DELHI", "MUMBAI", "BANGALORE"]
  });
});

// Driver name options
router.get('/drivers', (req, res) => {
  res.status(200).json({
    success: true,
    data: ["Rajesh Kumar", "Suresh Singh", "Mahesh Sharma", "Ramesh Gupta", "Satish Verma", "Vikash Singh"]
  });
});

// Vehicle vendor options
router.get('/vendors', (req, res) => {
  res.status(200).json({
    success: true,
    data: ["TATA MOTORS", "ASHOK LEYLAND", "MAHINDRA", "EICHER", "BHARAT BENZ"]
  });
});

// Loading person options
router.get('/loading-persons', (req, res) => {
  res.status(200).json({
    success: true,
    data: ["Mohan Singh", "Ravi Kumar", "Amit Sharma", "Pradeep Verma"]
  });
});

module.exports = router;