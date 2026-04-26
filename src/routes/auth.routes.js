const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * POST /api/auth/register
 * Register a new user
 * NOTE: En Tarea 2 se agrega cédula y los campos name/lastName
 * serán autocompletados desde el padrón electoral.
 * NOTE: En Tarea 3 el status pasará a 'pending' y se enviará email de verificación.
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
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Los apellidos son requeridos')
      .isLength({ min: 2, max: 120 })
      .withMessage('Los apellidos deben tener entre 2 y 120 caracteres'),
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
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('El teléfono es requerido')
      .matches(/^\d{8}$/)
      .withMessage('El teléfono debe ser un número de 8 dígitos'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, lastName, email, password, phone } = req.body;

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const user = new User({
        name,
        lastName,
        email,
        phone,
        passwordHash,
        authProvider: 'local',
        status: 'active', // Tarea 3 cambiará esto a 'pending' con verificación por email
      });

      await user.save();

      res.status(201).json({
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: user.status,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('[Auth] Error in register:', error);
      res.status(500).end();
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
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+passwordHash');

      if (!user) {
        return res.status(401).end();
      }

      // Usuarios de Google no pueden hacer login con contraseña
      if (user.authProvider !== 'local' || !user.passwordHash) {
        return res.status(401).json({ message: 'Usa Google para ingresar con esta cuenta' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return res.status(401).end();
      }

      // NOTE: Tarea 3 agrega validación de status === 'active' aquí
      // NOTE: Tarea 5 agrega 2FA aquí (retornará tempToken en vez de accessToken)

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
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('[Auth] Error in login:', error);
      res.status(500).end();
    }
  }
);

module.exports = router;