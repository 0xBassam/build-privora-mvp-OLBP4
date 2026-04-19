const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  tokenHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['tokenHash'] },
    { fields: ['expiresAt'] },
  ],
});

module.exports = RefreshToken;
