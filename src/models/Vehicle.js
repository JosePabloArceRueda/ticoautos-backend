const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: [true, 'La marca es requerida'],
      trim: true,
      index: true,
    },
    model: {
      type: String,
      required: [true, 'El modelo es requerido'],
      trim: true,
      index: true,
    },
    year: {
      type: Number,
      required: [true, 'El año es requerido'],
      index: true,
      validate: {
        validator: function (value) {
          const currentYear = new Date().getFullYear();
          return value >= 1950 && value <= currentYear + 1;
        },
        message: `El año debe estar entre 1950 y ${new Date().getFullYear() + 1}`,
      },
    },
    price: {
      type: Number,
      required: [true, 'El precio es requerido'],
      index: true,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'El precio debe ser mayor o igual a 0',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['AVAILABLE', 'SOLD'],
        message: 'El estado debe ser AVAILABLE o SOLD',
      },
      default: 'AVAILABLE',
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El propietario es requerido'],
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);