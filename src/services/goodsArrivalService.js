// services/goodsArrivalService.js
const GoodsArrival = require('../models/GoodsArrival');
const LocalManifest = require('../models/LocalManifest');
const mongoose = require('mongoose');

class GoodsArrivalService {
  // Get arrival statistics
  static async getArrivalStats(filters = {}) {
    try {
      const query = {};
      if (filters.branch && filters.branch !== 'ALL') query.branch = filters.branch;
      
      const stats = await GoodsArrival.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalArrivals: { $sum: 1 },
            totalPackages: { $sum: '$arrivalTotals.totalPckgs' },
            totalWeight: { $sum: '$arrivalTotals.totalWeight' },
            totalDamage: { $sum: '$arrivalTotals.damagePckgs' },
            avgUnloadingTime: { $avg: { $add: ['$unloadingHours', { $divide: ['$unloadingMinutes', 60] }] } }
          }
        }
      ]);
      
      return stats[0] || {
        totalArrivals: 0,
        totalPackages: 0,
        totalWeight: 0,
        totalDamage: 0,
        avgUnloadingTime: 0
      };
    } catch (error) {
      console.error('Get arrival stats error:', error);
      throw error;
    }
  }
  
  // Get daily arrival report
  static async getDailyArrivalReport(date) {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      const arrivals = await GoodsArrival.find({
        receiveDate: { $gte: startDate, $lte: endDate }
      }).populate('linkedManifest', 'vehicleNo driverName');
      
      return {
        date: startDate,
        totalArrivals: arrivals.length,
        arrivals: arrivals.map(arrival => ({
          manifestNo: arrival.manifestNo,
          fromStation: arrival.fromStation,
          driver: arrival.driver,
          vehicleNo: arrival.linkedManifest?.vehicleNo,
          packages: arrival.arrivalTotals.totalPckgs,
          weight: arrival.arrivalTotals.totalWeight,
          unloadingTime: `${arrival.unloadingHours}h ${arrival.unloadingMinutes}m`
        }))
      };
    } catch (error) {
      console.error('Get daily arrival report error:', error);
      throw error;
    }
  }
  
  // Get damage report
  static async getDamageReport(startDate, endDate) {
    try {
      const query = {};
      if (startDate || endDate) {
        query.receiveDate = {};
        if (startDate) query.receiveDate.$gte = new Date(startDate);
        if (endDate) query.receiveDate.$lte = new Date(endDate);
      }
      
      const arrivals = await GoodsArrival.find(query);
      
      const damageData = [];
      arrivals.forEach(arrival => {
        arrival.damageClaims.forEach(claim => {
          if (claim.damagePckgs > 0) {
            damageData.push({
              manifestNo: arrival.manifestNo,
              grNo: claim.grNo,
              damagePackages: claim.damagePckgs,
              claimAmount: claim.claimAmt,
              damageReason: claim.damageReason,
              receiveDate: arrival.receiveDate
            });
          }
        });
      });
      
      return damageData;
    } catch (error) {
      console.error('Get damage report error:', error);
      throw error;
    }
  }
  
  // Validate GR items against manifest
  static async validateGRItems(manifestNo, grItems) {
    try {
      const manifest = await LocalManifest.findOne({ manifestNo });
      if (!manifest) {
        return { valid: false, message: 'Manifest not found' };
      }
      
      const manifestTotalPackages = manifest.totalPackages;
      const manifestTotalWeight = manifest.totalWeight;
      
      const arrivalTotalPackages = grItems.reduce((sum, item) => sum + (item.receivePckgs || 0), 0);
      const arrivalTotalWeight = grItems.reduce((sum, item) => sum + (item.receiveWt || 0), 0);
      
      const packageDeviation = Math.abs(arrivalTotalPackages - manifestTotalPackages);
      const weightDeviation = Math.abs(arrivalTotalWeight - manifestTotalWeight);
      
      return {
        valid: packageDeviation === 0 && weightDeviation === 0,
        manifestTotals: {
          packages: manifestTotalPackages,
          weight: manifestTotalWeight
        },
        arrivalTotals: {
          packages: arrivalTotalPackages,
          weight: arrivalTotalWeight
        },
        deviations: {
          packages: packageDeviation,
          weight: weightDeviation
        },
        message: packageDeviation === 0 && weightDeviation === 0 
          ? 'GR items match manifest' 
          : `Deviation detected: ${packageDeviation} packages, ${weightDeviation} kg`
      };
    } catch (error) {
      console.error('Validate GR items error:', error);
      throw error;
    }
  }
}

module.exports = GoodsArrivalService;