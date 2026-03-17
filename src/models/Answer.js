const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'El chat es requerido'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El remitente es requerido'],
    },
    text: {
      type: String,
      required: [true, 'El texto del mensaje es requerido'],
      minlength: [1, 'El mensaje no puede estar vacío'],
      maxlength: [500, 'El mensaje no puede exceder 500 caracteres'],
    },
    // Type of message: 'question' (first message from the interested user) 
    // or 'answer' (response from the owner)
    messageType: {
      type: String,
      enum: ['question', 'answer'],
      default: 'question',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Answer', answerSchema);