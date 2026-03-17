const express = require('express');
const { query, validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');

const router = express.Router();

// Middleware validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// white list for sorting
const ALLOWED_SORT_FIELDS = ['price', 'year', 'createdAt'];

/**
 * GET /api/vehicles
 * Public list with combinable filters and pagination
 *
 * Query params:
 * - brand: string
 * - model: string
 * - minYear: number
 * - maxYear: number
 * - minPrice: number
 * - maxPrice: number
 * - status: AVAILABLE | SOLD
 * - page: number (default 1)
 * - limit: number (default 12, max 100)
 * - sort: field:order (price:asc, year:desc, createdAt:asc)
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page debe ser >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit debe estar entre 1 y 100'),
    query('minYear')
      .optional()
      .isInt()
      .withMessage('minYear debe ser un número'),
    query('maxYear')
      .optional()
      .isInt()
      .withMessage('maxYear debe ser un número'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('minPrice debe ser >= 0'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('maxPrice debe ser >= 0'),
    query('status')
      .optional()
      .isIn(['AVAILABLE', 'SOLD'])
      .withMessage('status debe ser AVAILABLE o SOLD'),
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

      // Construir filtro
      const filter = {};

      if (brand) filter.brand = { $regex: brand, $options: 'i' };
      if (model) filter.model = { $regex: model, $options: 'i' };

      if (minYear || maxYear) {
        filter.year = {};
        if (minYear) filter.year.$gte = parseInt(minYear);
        if (maxYear) filter.year.$lte = parseInt(maxYear);
      }

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      if (status) filter.status = status;

      // Parse sort
      const [sortField, sortOrder] = sort.split(':');
      const sortObj = {};

      if (ALLOWED_SORT_FIELDS.includes(sortField)) {
        sortObj[sortField] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortObj.createdAt = -1; // default
      }

      // Calculate skip
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Queries
      const total = await Vehicle.countDocuments(filter);
      const data = await Vehicle.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        data,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      });
    } catch (error) {
      console.error('[Vehicles] Error en listado:', error);
      res.status(500).json({ message: 'Error en el servidor' });
    }
  }
);

/**
 * GET /api/vehicles/:id
 * Vehicle detail (public)
 *The owner only returns { _id, name }
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // check ObjectId
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de vehículo inválido' });
    }

    const vehicle = await Vehicle.findById(id).populate('owner', 'name');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    res.status(200).json(vehicle);
  } catch (error) {
    console.error('[Vehicles] Error en detalle:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});


module.exports = router;