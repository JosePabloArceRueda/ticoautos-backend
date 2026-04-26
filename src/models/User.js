const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // --- Datos personales (autocompletados desde el padrón electoral) ---
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [80, 'El nombre no puede exceder 80 caracteres'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Los apellidos son requeridos'],
      minlength: [2, 'Los apellidos deben tener al menos 2 caracteres'],
      maxlength: [120, 'Los apellidos no pueden exceder 120 caracteres'],
      trim: true,
    },
    cedula: {
      type: String,
      unique: true,
      sparse: true, // permite null para usuarios de Google antes de completar registro
      trim: true,
    },
    birthDate: {
      type: Date,
    },

    // --- Contacto ---
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor proporciona un email válido',
      ],
    },
    phone: {
      type: String,
      trim: true,
    },

    // --- Autenticación ---
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    passwordHash: {
      type: String,
      // No requerido: usuarios de Google no tienen contraseña local
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // null para usuarios locales
    },

    // --- Estado de la cuenta ---
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'pending',
    },

    // --- Verificación de correo ---
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // --- 2FA por SMS ---
    twoFactorCode: {
      type: String,
      select: false,
    },
    twoFactorExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);