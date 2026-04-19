const app = require('./app');
const config = require('./config/config');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

// Load all models to register associations
require('./models');

const { startRetentionScheduler } = require('./jobs/retentionScheduler');

const start = async () => {
  await connectDB();

  const server = app.listen(config.port, () => {
    logger.info(`Privora API running on port ${config.port} [${config.env}]`);
    logger.info(`API Docs: http://localhost:${config.port}/api-docs`);
  });

  // Start scheduled jobs (retention enforcement + pre-expiry alerts)
  startRetentionScheduler();

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise rejection', { reason });
  });
};

start();
