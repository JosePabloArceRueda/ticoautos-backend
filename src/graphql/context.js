const jwt = require('jsonwebtoken');

/**
 * Extract authenticated user from the Authorization header.
 * Same JWT used by the REST API works here.
 * graphql-http passes the Express req directly as first argument.
 * Returns { user: { id, email } } or { user: null } if not authenticated.
 */
function buildContext(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return { user: null };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: { id: decoded.userId, email: decoded.email } };
  } catch {
    return { user: null };
  }
}

module.exports = { buildContext };
