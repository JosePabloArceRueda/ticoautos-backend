const express = require('express');
const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const authMiddleware = require('../middlewares/auth');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const upload = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Middleware validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400);
  }
  next();
};

/**
 * POST /api/vehicles (private)
 * Create vehicle (owner = authenticated user)
 */
router.post(
  '/',
  authMiddleware,
  [
    body('brand')
      .trim()
      .notEmpty()
      .withMessage('La marca es requerida'),
    body('model')
      .trim()
      .notEmpty()
      .withMessage('El modelo es requerido'),
    body('year')
      .isInt()
      .withMessage('El año debe ser un número'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('El precio debe ser >= 0'),
    body('description')
      .optional()
      .trim(),
    body('status')
      .optional()
      .isIn(['AVAILABLE', 'SOLD'])
      .withMessage('El estado debe ser AVAILABLE o SOLD'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { brand, model, year, price, description, status } = req.body;

      const vehicle = new Vehicle({
        brand,
        model,
        year,
        price,
        description,
        status: status || 'AVAILABLE',
        owner: req.user.id,
      });

      await vehicle.save();

      res.status(201).json(vehicle);
    } catch (error) {
      console.error('[Vehicles] Error en crear:', error);
      res.status(500);
    }
  }
);

/**
 * PUT /api/vehicles/:id (private)
 * Update vehicle (owner only)
 */
router.put(
  '/:id',
  authMiddleware,
  [
    param('id')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('ID de vehículo inválido'),
    body('brand')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('La marca no puede estar vacía'),
    body('model')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('El modelo no puede estar vacío'),
    body('year')
      .optional()
      .isInt()
      .withMessage('El año debe ser un número'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('El precio debe ser >= 0'),
    body('description')
      .optional()
      .trim(),
    body('status')
      .optional()
      .isIn(['AVAILABLE', 'SOLD'])
      .withMessage('El estado debe ser AVAILABLE o SOLD'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { brand, model, year, price, description, status } = req.body;

      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return res.status(404);
      }

      // Verify that it is the owner
      if (vehicle.owner.toString() !== req.user.id) {
        return res.status(403);
      }

      // Update fields
      if (brand !== undefined) vehicle.brand = brand;
      if (model !== undefined) vehicle.model = model;
      if (year !== undefined) vehicle.year = year;
      if (price !== undefined) vehicle.price = price;
      if (description !== undefined) vehicle.description = description;
      if (status !== undefined) vehicle.status = status;

      await vehicle.save();

      res.status(200).json(vehicle);
    } catch (error) {
      console.error('[Vehicles] Error en actualizar:', error);
      res.status(500);
    }
  }
);

/**
 * DELETE /api/vehicles/:id (private)
 * Delete vehicle (owner only)
 */
router.delete(
  '/:id',
  authMiddleware,
  [
    param('id')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('ID de vehículo inválido'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return res.status(404);
      }

      // Verify that it is the owner
      if (vehicle.owner.toString() !== req.user.id) {
        return res
          .status(403);
      }

      await Vehicle.findByIdAndDelete(id);

      res.status(204).send();
    } catch (error) {
      console.error('[Vehicles] Error en eliminar:', error);
      res.status(500);
    }
  }
);

/**
 * PATCH /api/vehicles/:id/mark-sold (private)
 * Mark vehicle as sold (owner only)
 */
router.patch(
  '/:id/mark-sold',
  authMiddleware,
  [
    param('id')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('ID de vehículo inválido'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return res.status(404);
      }

      // Verify that it is the owner
      if (vehicle.owner.toString() !== req.user.id) {
        return res.status(403);
      }

      vehicle.status = 'SOLD';
      await vehicle.save();

      res.status(200).json(vehicle);
    } catch (error) {
      console.error('[Vehicles] Error en mark-sold:', error);
      res.status(500);
    }
  }
);
// Upload vehicle images - POST /api/vehicles/:id/upload
router.post(
  '/:id/upload',
  authMiddleware,
  upload.array('images', 5), // Maximum 5 images
  async (req, res) => {
    try {
      // Verify vehicle exists and belongs to user
      const vehicle = await Vehicle.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).end();
      }

      if (vehicle.owner.toString() !== req.user.id) {
        return res.status(403);
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400);
      }

      const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
      vehicle.images = [...(vehicle.images || []), ...imageUrls];
      await vehicle.save();

      res.json({
        message: 'Imágenes subidas correctamente',
        images: vehicle.images,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500);
    }
  }
);

// Delete vehicle image - DELETE /api/vehicles/:id/images/:imageUrl
router.delete('/:id/images/:imageUrl', authMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404);
    }

    if (vehicle.owner.toString() !== req.user.id) {
      return res.status(403);
    }

    // Decode image URL
    const decodedImageUrl = decodeURIComponent(req.params.imageUrl);

    // Remove image from array
    vehicle.images = vehicle.images.filter((img) => img !== decodedImageUrl);
    await vehicle.save();

    // Delete physical file
    const filePath = path.join(__dirname, `..${decodedImageUrl}`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({
      message: 'Imagen eliminada correctamente',
      images: vehicle.images,
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500);
  }
});

module.exports = router;