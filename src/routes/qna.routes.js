const express = require('express');
const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const authMiddleware = require('../middlewares/auth');
const Vehicle = require('../models/Vehicle');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400);
  }
  next();
};

/**
 * POST /api/vehicles/:vehicleId/chat
 * Start a chat or send first message (question)
 * Interested user initiates the chat or continues if it already exists
 */
router.post(
  '/vehicles/:vehicleId/chat',
  authMiddleware,
  [
    param('vehicleId')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid vehicle ID'),
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ min: 1, max: 500 })
      .withMessage('Message must be between 1 and 500 characters'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { vehicleId } = req.params;
      const { text } = req.body;
      const userId = req.user.id;

      // Verify vehicle exists
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404);
      }

      // Validate that user is not the vehicle owner
      if (vehicle.owner.toString() === userId) {
        return res.status(403);
      }

      const ownerId = vehicle.owner.toString();

      // Check if chat already exists between this interested user and this vehicle
      let chat = await Question.findOne({
        vehicle: vehicleId,
        interested: userId,
      });

      if (chat) {
        // Chat already exists, add message
        const message = new Answer({
          chat: chat._id,
          sender: userId,
          text,
          messageType: 'question',
        });

        await message.save();
        await message.populate('sender', 'name');

        return res.status(201).json({
          chatId: chat._id,
          message,
          isNewChat: false,
        });
      }

      // Create new chat
      chat = new Question({
        vehicle: vehicleId,
        interested: userId,
        owner: ownerId,
      });

      await chat.save();

      // Create first message
      const message = new Answer({
        chat: chat._id,
        sender: userId,
        text,
        messageType: 'question',
      });

      await message.save();
      await message.populate('sender', 'name');
      await chat.populate('interested', 'name');
      await chat.populate('owner', 'name');

      res.status(201).json({
        chatId: chat._id,
        chat,
        message,
        isNewChat: true,
      });
    } catch (error) {
      console.error('[Q&A] Error iniciado el chat:', error);
      if (error.code === 11000) {
        // Chat already exists, search and return
        try {
          const { vehicleId } = req.params;
          const existingChat = await Question.findOne({
            vehicle: vehicleId,
            interested: req.user.id,
          });
          return res.status(409);
        } catch (e) {
          return res.status(500);
        }
      }
      res.status(500);
    }
  }
);

/**
 * POST /api/chats/:chatId/message
 * Send message in an existing chat
 * Can be sent by interested (question) or owner (answer)
 * Rule: must alternate (interested→owner→interested...)
 */
router.post(
  '/chats/:chatId/message',
  authMiddleware,
  [
    param('chatId')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('ID de chat invalido'),
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Mensaje es requerido')
      .isLength({ min: 1, max: 500 })
      .withMessage('El mensaje debe tener entre 1 y 500 caracteres'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const { text } = req.body;
      const userId = req.user.id;

      // Verify chat exists
      const chat = await Question.findById(chatId);
      if (!chat) {
        return res.status(404);
      }

      // Validate that user is interested or owner
      const isInterested = chat.interested.toString() === userId;
      const isOwner = chat.owner.toString() === userId;

      if (!isInterested && !isOwner) {
        return res.status(403)
      }

      // Get last message to validate alternation
      const lastMessage = await Answer.findOne({ chat: chatId }).sort({
        createdAt: -1,
      });

      // If there is a previous message, validate that it is not from the same user
      if (lastMessage) {
        if (lastMessage.sender.toString() === userId) {
          return res.status(422);
        }
      }

      // Determine message type
      const messageType = isInterested ? 'question' : 'answer';

      // Create message
      const message = new Answer({
        chat: chatId,
        sender: userId,
        text,
        messageType,
      });

      await message.save();
      await message.populate('sender', 'name');

      res.status(201).json(message);
    } catch (error) {
      console.error('[Q&A] Error enviando mensaje:', error);
      res.status(500);
    }
  }
);

/**
 * GET /api/chats/:chatId/messages
 * Get chat history
 * Can be accessed by interested or owner
 */
router.get(
  '/chats/:chatId/messages',
  authMiddleware,
  [
    param('chatId')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid chat ID'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 50 } = req.query;

      // Verify chat exists
      const chat = await Question.findById(chatId)
        .populate('vehicle', 'brand model')
        .populate('interested', 'name email')
        .populate('owner', 'name email');

      if (!chat) {
        return res.status(404);
      }

      // Validate that user is interested or owner
      const isInterested = chat.interested._id.toString() === userId;
      const isOwner = chat.owner._id.toString() === userId;

      if (!isInterested && !isOwner) {
        return res.status(403);
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const total = await Answer.countDocuments({ chat: chatId });
      const messages = await Answer.find({ chat: chatId })
        .populate('sender', 'name')
        .sort({ createdAt: 1 }) // Chronological order
        .skip(skip)
        .limit(limitNum);

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        chat,
        messages,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      });
    } catch (error) {
      console.error('[Q&A] Error recuperando mensaje:', error);
      res.status(500);
    }
  }
);

/**
 * GET /api/me/chats/as-interested
 * Get all my chats as interested user
 */
router.get('/me/chats/as-interested', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Question.countDocuments({ interested: userId });
    const chats = await Question.find({ interested: userId })
      .populate('vehicle', 'brand model year price')
      .populate('owner', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get last message from each chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Answer.findOne({ chat: chat._id })
          .populate('sender', 'name')
          .sort({ createdAt: -1 });

        return {
          ...chat.toObject(),
          lastMessage,
        };
      })
    );

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      data: chatsWithLastMessage,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('[Q&A] Error al recuperar chats:', error);
    res.status(500);
  }
});

/**
 * GET /api/me/chats/as-owner
 * Get all chats for my vehicles as owner
 */
router.get('/me/chats/as-owner', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Question.countDocuments({ owner: userId });
    const chats = await Question.find({ owner: userId })
      .populate('vehicle', 'brand model year price')
      .populate('interested', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get last message from each chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Answer.findOne({ chat: chat._id })
          .populate('sender', 'name')
          .sort({ createdAt: -1 });

        return {
          ...chat.toObject(),
          lastMessage,
        };
      })
    );

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      data: chatsWithLastMessage,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('[Q&A] Error al recuperar los chats del propietario:', error);
    res.status(500);
  }
});

/**
 * GET /api/me/chats/status/:vehicleId
 * Get chat status with a specific vehicle
 * Useful to verify if chat exists and identify the other participant
 */
router.get(
  '/me/chats/status/:vehicleId',
  authMiddleware,
  [
    param('vehicleId')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid vehicle ID'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { vehicleId } = req.params;
      const userId = req.user.id;

      // Check if chat exists as interested user
      const chatAsInterested = await Question.findOne({
        vehicle: vehicleId,
        interested: userId,
      }).populate('owner', 'name');

      if (chatAsInterested) {
        return res.status(200).json({
          chatExists: true,
          chatId: chatAsInterested._id,
          role: 'interested',
          otherUser: chatAsInterested.owner,
        });
      }

      // Check if chat exists as owner
      const chatAsOwner = await Question.findOne({
        vehicle: vehicleId,
        owner: userId,
      }).populate('interested', 'name');

      if (chatAsOwner) {
        return res.status(200).json({
          chatExists: true,
          chatId: chatAsOwner._id,
          role: 'owner',
          otherUser: chatAsOwner.interested,
        });
      }

      res.status(200).json({
        chatExists: false,
      });
    } catch (error) {
      console.error('[Q&A] Error en obtener estado del chat:', error);
      res.status(500);
    }
  }
);

module.exports = router;