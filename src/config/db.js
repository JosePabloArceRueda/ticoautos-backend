const mongoose = require('mongoose');

function connectToDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[DB] MONGO_URI no está definida en .env');
    return;
  }

  // connection
  mongoose.connect(uri, {});

  const db = mongoose.connection;

  db.on('connecting', () => {
    console.log('[DB] trying to connect with MongoDB…');
  });

  db.on('error', (err) => {
    console.error('[DB] Connection error:', err.message);
  });

  db.on('connected', () => {
    console.log('[DB] Connection established to MongoDB');
  });

  db.on('disconnected', () => {
    console.warn('[DB] Connection to MongoDB lost');
  });

  db.on('reconnected', () => {
    console.log('[DB] Reconnected to MongoDB');
  });
}

module.exports = { connectToDatabase };