const mongoose = require('mongoose');

function connectToDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[DB] MONGO_URI no está definida en .env');
    return;
  }

  // Conexión
  mongoose.connect(uri, {
    // Puedes ajustar timeouts si no quieres esperar mucho:
    // serverSelectionTimeoutMS: 5000,
    // heartbeatFrequencyMS: 10000,
  });

  const db = mongoose.connection;

  db.on('connecting', () => {
    console.log('[DB] Intentando conectar a MongoDB…');
  });

  db.on('error', (err) => {
    console.error('[DB] Error de conexión:', err.message);
  });

  db.on('connected', () => {
    console.log('[DB] Conexión establecida a MongoDB');
  });

  db.on('disconnected', () => {
    console.warn('[DB] Conexión a MongoDB perdida');
  });

  db.on('reconnected', () => {
    console.log('[DB] Reconectado a MongoDB');
  });
}

module.exports = { connectToDatabase };