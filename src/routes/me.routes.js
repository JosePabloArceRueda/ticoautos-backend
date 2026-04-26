const express = require('express');
const { query, validationResult } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400);
  }
  next();
};

/**
 * GET /api/me
 * Returns the authenticated user's data (protected)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404);
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      cedula: user.cedula,
      birthDate: user.birthDate,
      authProvider: user.authProvider,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('[Me] Error:', error);
    res.status(500);
  }
});

/**
 * GET /api/me/vehicles
 * Get all vehicles owned by authenticated user with pagination and filters
 * Query params: page, limit, brand, model, minYear, maxYear, minPrice, maxPrice, status, sort
 */
router.get(
  '/vehicles',
  authMiddleware,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('minYear')
      .optional()
      .isInt()
      .withMessage('Min year must be a number'),
    query('maxYear')
      .optional()
      .isInt()
      .withMessage('Max year must be a number'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Min price must be >= 0'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Max price must be >= 0'),
    query('status')
      .optional()
      .isIn(['AVAILABLE', 'SOLD'])
      .withMessage('Status must be AVAILABLE or SOLD'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        brand,
        model,
        minYear,
        maxYear,
        minPrice,
        maxPrice,
        status,
        page = 1,
        limit = 12,
        sort = 'createdAt:desc',
      } = req.query;

      // Build filter object - always filter by owner
      const filter = { owner: userId };

      // Add optional filters
      if (brand) {
        filter.brand = { $regex: brand, $options: 'i' };
      }

      if (model) {
        filter.model = { $regex: model, $options: 'i' };
      }

      if (minYear || maxYear) {
        filter.year = {};
        if (minYear) filter.year.$gte = parseInt(minYear, 10);
        if (maxYear) filter.year.$lte = parseInt(maxYear, 10);
      }

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      if (status) {
        filter.status = status;
      }

      // Parse sort parameter
      const [sortField, sortOrder] = sort.split(':');
      const sortObj = {};
      const ALLOWED_SORT_FIELDS = ['price', 'year', 'createdAt'];

      if (ALLOWED_SORT_FIELDS.includes(sortField)) {
        sortObj[sortField] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortObj.createdAt = -1; // Default sort
      }

      // Calculate pagination
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Execute queries
      const total = await Vehicle.countDocuments(filter);
      const vehicles = await Vehicle.find(filter)
        .populate('owner', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalPages = Math.ceil(total / limitNum);

      // Return response with pagination info
      res.status(200).json({
        data: vehicles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages,
        },
      });
    } catch (error) {
      console.error('[Me Vehicles] Error:', error);
      res.status(500);
    }
  }
);

module.exports = router;