const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Personal Data
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
      sparse: true, // permit null for google user before completing registration
      trim: true,
    },
    birthDate: {
      type: Date,
    },

    // Contact
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

    // AUTH
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    passwordHash: {
      type: String,
      // Users google not have access to password login
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // null local users
    },

    // Status account 
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'pending',
    },

    // verification with mail
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // 2FA with SMS
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