const jwt = require('jsonwebtoken');

/**
 * Middleware  verify JWT
 * Wait header: Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401);
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // add userId to req.user
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    return res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = authMiddleware;