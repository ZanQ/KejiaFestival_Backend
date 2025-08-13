const mongoose = require('mongoose');
const { createServer } = require('http');
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
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize Socket.IO
  io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Initialize socket service
  socketService.initialize(io);
  logger.info('Socket.IO initialized successfully');

  server = httpServer.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
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
