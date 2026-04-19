const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OtpCode = sequelize.define('OtpCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  codeHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'bcrypt hash of the OTP — never store in plaintext',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of failed verification attempts',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
}, {
  tableName: 'otp_codes',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['expiresAt'] },
  ],
});

module.exports = OtpCode;
