const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Middleware valdation errors 
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400);
  }
  next();
};

/**
 * POST /api/auth/register
 * Register a new user and return JWT
 */
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('El nombre es requerido')
      .isLength({ min: 2, max: 80 })
      .withMessage('El nombre debe tener entre 2 y 80 caracteres'),
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail()
      .custom(async (email) => {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          throw new Error('El email ya está registrado');
        }
      }),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Hashear password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // create user
      const user = new User({
        name,
        email,
        passwordHash,
      });

      await user.save();

      res.status(201).json({
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('[Auth] Error en registro:', error);
      res.status(500);
    }
  }
);

/**
 * POST /api/auth/login
 * Login user and return JWT
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Search user (include passwordHash with select)
      const user = await User.findOne({ email }).select('+passwordHash');

      if (!user) {
        return res.status(401);
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return res.status(401);
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );

      res.status(200).json({
        accessToken: token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('[Auth] Error en login:', error);
      res.status(500);
    }
  }
);

module.exports = router;