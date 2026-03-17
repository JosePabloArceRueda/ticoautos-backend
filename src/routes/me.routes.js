const express = require('express');
const authMiddleware = require('../middlewares/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /api/me
 * Returns the authenticated user's data (protected)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404);
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('[Me] Error:', error);
    res.status(500);
  }
});

module.exports = router;