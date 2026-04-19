const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

let sequelize;

if (config.db.url) {
  sequelize = new Sequelize(config.db.url, {
    dialect: config.db.dialect,
    logging: config.db.logging,
    pool: config.db.pool,
    dialectOptions: {
      ssl: config.env === 'production'
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
  });
} else {
  sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: config.db.logging,
    pool: config.db.pool,
  });
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    // In development: alter tables to match models
    // In production: only create missing tables, never alter or drop
    const syncOptions = config.env === 'development' ? { alter: true } : { force: false };
    await sequelize.sync(syncOptions);
    logger.info('Database synchronized.');
  } catch (err) {
    logger.error('Unable to connect to the database:', err);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
