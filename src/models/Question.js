const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'El vehículo es requerido'],
      index: true,
    },
    interested: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El interesado es requerido'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El propietario es requerido'],
      index: true,
    },
    // Unique index: only one chat per (vehicle, interested user)
    // There cannot be two chats from the same interested user about the same vehicle
  },
  { timestamps: true }
);

// Unique index: one chat per vehicle + interested user
questionSchema.index({ vehicle: 1, interesado: 1 }, { unique: true });

module.exports = mongoose.model('Question', questionSchema);