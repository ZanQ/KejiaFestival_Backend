const mongoose = require('mongoose');
const { createServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const { socketService } = require('./services');

let server;
let io;

mongoose.connect(config.mongoose.url, config.mongoose.options).then(async () => {
  logger.info('Connected to MongoDB');
  
  // Initialize default settings
  try {
    const { Settings } = require('./models');
    await Settings.initializeDefaults();
    logger.info('Default settings initialized');
  } catch (error) {
    logger.error('Error initializing default settings:', error);
  }
  
  // Create server (HTTP or HTTPS based on configuration)
  let httpServer;
  
  if (config.env === 'production') {
    // HTTPS Server for production
    try {
      const httpsOptions = {
        key: fs.readFileSync('./src/cert/privkey.pem'),
        cert: fs.readFileSync('./src/cert/fullchain.pem'),
        ca: fs.readFileSync('./src/cert/chain.pem')
      };
      
      httpServer = createHttpsServer(httpsOptions, app);
      logger.info('HTTPS server created with SSL certificates');
    } catch (error) {
      logger.error('Failed to create HTTPS server:', error);
      logger.info('Falling back to HTTP server');
      httpServer = createServer(app);
    }
  } else {
    // HTTP Server for development or when SSL is disabled
    httpServer = createServer(app);
    logger.info('HTTP server created');
  }
  
  // Initialize Socket.IO
  io = new Server(httpServer, {
    cors: {
      origin: config.frontend.url ? [config.frontend.url] : ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Initialize socket service
  socketService.initialize(io);
  logger.info('Socket.IO initialized successfully');

  server = httpServer.listen(config.port, () => {
    const protocol = config.env === 'production' && config.ssl && config.ssl.enabled ? 'https' : 'http';
    logger.info(`${protocol.toUpperCase()} server listening on port ${config.port}`);
    logger.info(`Server URL: ${protocol}://localhost:${config.port}`);
    logger.info('WebSocket server ready for connections');
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
