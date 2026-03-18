const express = require('express');
const { query, validationResult, param } = require('express-validator');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Whitelist for sorting fields
const ALLOWED_SORT_FIELDS = ['price', 'year', 'createdAt'];

/**
 * GET /api/vehicles
 * Public list with combinable filters and pagination
 *
 * Query params:
 * - brand: string (case-insensitive search)
 * - model: string (case-insensitive search)
 * - minYear: number
 * - maxYear: number
 * - minPrice: number (>= 0)
 * - maxPrice: number (>= 0)
 * - status: AVAILABLE | SOLD
 * - page: number (default 1, min 1)
 * - limit: number (default 12, max 100)
 * - sort: field:order (price:asc, year:desc, createdAt:asc)
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe estar entre 1 y 100'),
    query('minYear')
      .optional()
      .isInt()
      .withMessage('El año mínimo debe ser un número'),
    query('maxYear')
      .optional()
      .isInt()
      .withMessage('El año máximo debe ser un número'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('El precio mínimo debe ser >= 0'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('El precio máximo debe ser >= 0'),
    query('status')
      .optional()
      .isIn(['AVAILABLE', 'SOLD'])
      .withMessage('El estado debe ser AVAILABLE o SOLD'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
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

      // Build filter object
      const filter = {};

      // Add string filters with case-insensitive search
      if (brand) {
        filter.brand = { $regex: brand, $options: 'i' };
      }

      if (model) {
        filter.model = { $regex: model, $options: 'i' };
      }

      // Add year range filter
      if (minYear || maxYear) {
        filter.year = {};
        if (minYear) filter.year.$gte = parseInt(minYear, 10);
        if (maxYear) filter.year.$lte = parseInt(maxYear, 10);
      }

      // Add price range filter
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      // Add status filter
      if (status) {
        filter.status = status;
      }

      // Parse sort parameter
      const [sortField, sortOrder] = sort.split(':');
      const sortObj = {};

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
        .populate('owner', 'username email')
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
          totalPages,
        },
      });
    } catch (error) {
      console.error('[Vehicles] Error in listing:', error);
      res.status(500).json({
        message: 'Error al obtener vehículos',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/vehicles/:id
 * Get vehicle detail by ID (public)
 * Populates owner information
 */
router.get(
  '/:id',
  [
    param('id')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('ID de vehículo inválido'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find vehicle and populate owner
      const vehicle = await Vehicle.findById(id).populate(
        'owner',
        'username email'
      );

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado',
        });
      }

      res.status(200).json(vehicle);
    } catch (error) {
      console.error('[Vehicles] Error in detail:', error);
      res.status(500).json({
        message: 'Error al obtener vehículo',
        error: error.message,
      });
    }
  }
);

module.exports = router;