// middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

// Validation rules for creating goods arrival
exports.validateCreateGoodsArrival = [
  body('branch').notEmpty().withMessage('Branch is required'),
  body('selectGodown').notEmpty().withMessage('Godown selection is required'),
  body('manifestNo').notEmpty().withMessage('Manifest number is required'),
  body('fromStation').notEmpty().withMessage('From station is required'),
  body('unloadingPerson').notEmpty().withMessage('Unloading person is required'),
  body('receiveDate').notEmpty().withMessage('Receive date is required'),
  body('linkedManifestId').notEmpty().withMessage('Linked manifest ID is required'),
  body('grItems').isArray().withMessage('GR items must be an array'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation rules for ID parameter
exports.validateIdParam = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation rules for query parameters
exports.validateQueryParams = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  }
];