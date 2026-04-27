require('dotenv').config();
const os = require('os');
const { createHandler } = require('graphql-http/lib/use/express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');
const { buildContext } = require('./graphql/context');
const app = require('./app');
const { connectToDatabase } = require('./config/db');

const PORT = process.env.PORT || 3000;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return 'localhost';
}

const startServer = async () => {
  try {
    await connectToDatabase();

    const schema = makeExecutableSchema({ typeDefs, resolvers });
    app.all('/graphql', createHandler({ schema, context: buildContext }));

    const localIP = getLocalIP();

    // In development, use LAN IP for FRONTEND_URL so email verification
    // links work from any device on the network
    if (process.env.NODE_ENV !== 'production') {
      const frontendPort = new URL(process.env.FRONTEND_URL || 'http://localhost:5173').port || '5173';
      process.env.FRONTEND_URL = `http://${localIP}:${frontendPort}`;
    }

    app.listen(PORT, () => {
      console.log(`[ticoautos-backend] Local:   http://localhost:${PORT}`);
      console.log(`[ticoautos-backend] Network: http://${localIP}:${PORT}`);
      console.log(`[ticoautos-backend] Frontend URL (emails): ${process.env.FRONTEND_URL}`);
      console.log(`[ticoautos-backend] GraphQL:  http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error('[Server] Error starting server:', error);
    process.exit(1);
  }
};

startServer();