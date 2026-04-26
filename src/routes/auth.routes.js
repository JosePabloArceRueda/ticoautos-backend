const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { validateCedula, parseBirthDate } = require('../services/padron.service');
const { sendVerificationEmail } = require('../services/email.service');

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
 * Body: { cedula, email, password, phone }
 * name, lastName and birthDate are auto-filled from the TSE padrón API.
 */
router.post(
  '/register',
  [
    body('cedula')
      .trim()
      .notEmpty()
      .withMessage('La cédula es requerida')
      .matches(/^\d{9}$/)
      .withMessage('La cédula debe ser un número de 9 dígitos'),
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
      const { cedula, email, password, phone } = req.body;

      // Check cedula not already registered
      const existingCedula = await User.findOne({ cedula });
      if (existingCedula) {
        return res.status(400).json({ message: 'Esta cédula ya está registrada' });
      }

      // Validate cedula against TSE padrón and check age
      const { valid, person, error } = await validateCedula(cedula);
      if (!valid) {
        return res.status(400).json({ message: error });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const verificationToken = crypto.randomBytes(32).toString('hex');

      const user = new User({
        cedula,
        name: person.nombre,
        lastName: `${person.primerApellido} ${person.segundoApellido}`.trim(),
        birthDate: parseBirthDate(person.fechaNacimiento),
        email,
        phone,
        passwordHash,
        authProvider: 'local',
        status: 'pending',
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await user.save();

      try {
        await sendVerificationEmail(user, verificationToken);
      } catch (emailError) {
        // Roll back user creation so they can retry registration
        await user.deleteOne();
        console.error('[Auth] SendGrid error:', emailError?.response?.body ?? emailError.message);
        return res.status(502).json({ message: 'No se pudo enviar el correo de verificación. Intentá de nuevo.' });
      }

      res.status(201).json({
        id: user._id,
        cedula: user.cedula,
        name: user.name,
        lastName: user.lastName,
        birthDate: user.birthDate,
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

      // user goolge no access to login with password
      if (user.authProvider !== 'local' || !user.passwordHash) {
        return res.status(401).json({ message: 'Usa Google para ingresar con esta cuenta' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return res.status(401).end();
      }

      if (user.status === 'pending') {
        return res.status(403).json({ message: 'Debes verificar tu correo electrónico antes de ingresar' });
      }

      // NOTE: Task 5 will add 2FA here (returns tempToken instead of accessToken)

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

/**
 * GET /api/auth/verify-email?token=xxx
 * Activate user account from the link sent by email.
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token requerido' });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ message: 'El enlace de verificación es inválido o ha expirado' });
    }

    user.status = 'active';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Cuenta activada correctamente. Ya podés ingresar.' });
  } catch (error) {
    console.error('[Auth] Error in verify-email:', error);
    res.status(500).end();
  }
});

module.exports = router;