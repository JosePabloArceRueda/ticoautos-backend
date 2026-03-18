require('dotenv').config();
const app = require('./app');
const { connectToDatabase } = require('./config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database first
    await connectToDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`[ticoautos-backend] Server run in http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Error starting server:', error);
    process.exit(1);
  }
};

startServer();