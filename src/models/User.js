const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [80, 'El nombre no puede exceder 80 caracteres'],
      trim: true,
    },
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
    passwordHash: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      select: false, //Do not include by default in queries
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);