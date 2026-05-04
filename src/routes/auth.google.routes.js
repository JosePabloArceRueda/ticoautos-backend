const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('../config/passport');
const User = require('../models/User');
const { validateCedula, parseBirthDate } = require('../services/padron.service');
const { sendVerificationEmail } = require('../services/email.service');
const crypto = require('crypto');

const router = express.Router();

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * GET /api/auth/google
 * Redirect user to Google consent screen.
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * GET /api/auth/google/callback
 * Google redirects here after authentication.
 *
 * - Existing Google user  → issue JWT, redirect to frontend
 * - Email conflict        → redirect to frontend with error
 * - New user              → issue short-lived tempToken, redirect to frontend cedula form
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL()}/login?error=google_failed` }),
  (req, res) => {
    const result = req.user;

    if (result.type === 'email_conflict') {
      return res.redirect(`${FRONTEND_URL()}/login?error=email_conflict`);
    }

    if (result.type === 'existing') {
      const { user } = result;

      if (user.status === 'pending') {
        return res.redirect(`${FRONTEND_URL()}/login?error=pending_verification`);
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );

      return res.redirect(`${FRONTEND_URL()}/oauth/callback?token=${token}`);
    }

    // New user — issue a short-lived temp token with Google profile data
    // Frontend uses this to show the cedula form
    const tempToken = jwt.sign(
      { googleId: result.googleId, email: result.email, name: result.name, intent: 'google_register' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.redirect(`${FRONTEND_URL()}/register/complete?tempToken=${tempToken}`);
  }
);

/**
 * POST /api/auth/google/complete-registration
 * Called by the frontend after Google OAuth for new users.
 * Body: { tempToken, cedula, phone }
 * Validates cedula against TSE, checks age, creates the user.
 */
router.post(
  '/google/complete-registration',
  [
    body('tempToken').notEmpty().withMessage('Token requerido'),
    body('cedula')
      .trim()
      .notEmpty()
      .withMessage('La cédula es requerida')
      .matches(/^\d{9}$/)
      .withMessage('La cédula debe ser un número de 9 dígitos'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { tempToken, cedula } = req.body;

      // Verify and decode the temp token from Google callback
      let decoded;
      try {
        decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ message: 'Token inválido o expirado. Iniciá el proceso de nuevo.' });
      }

      if (decoded.intent !== 'google_register') {
        return res.status(401).json({ message: 'Token inválido' });
      }

      // Recheck that googleId and email are still not registered
      const existingGoogle = await User.findOne({ googleId: decoded.googleId });
      if (existingGoogle) {
        return res.status(409).json({ message: 'Esta cuenta de Google ya está registrada' });
      }

      const existingEmail = await User.findOne({ email: decoded.email });
      if (existingEmail) {
        return res.status(409).json({ message: 'Este email ya está registrado con otra cuenta' });
      }

      const existingCedula = await User.findOne({ cedula });
      if (existingCedula) {
        return res.status(409).json({ message: 'Esta cédula ya está registrada' });
      }

      // Validate cedula against TSE padrón and check age
      const { valid, person, error } = await validateCedula(cedula);
      if (!valid) {
        return res.status(400).json({ message: error });
      }

      const user = new User({
        googleId: decoded.googleId,
        cedula,
        name: person.nombre,
        lastName: `${person.primerApellido} ${person.segundoApellido}`.trim(),
        birthDate: parseBirthDate(person.fechaNacimiento),
        email: decoded.email,
        authProvider: 'google',
        status: 'active',
      });

      await user.save();

      res.status(201).json({
        id: user._id,
        cedula: user.cedula,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('[Google Register] Error:', error);
      res.status(500).end();
    }
  }
);

module.exports = router;
