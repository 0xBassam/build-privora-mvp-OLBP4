const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  nationalId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Encrypted Saudi National ID — for future Nafath integration',
  },
  role: {
    type: DataTypes.ENUM('user', 'org_admin', 'super_admin'),
    defaultValue: 'user',
    allowNull: false,
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Set for org_admin users',
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Only for admin accounts — users authenticate via OTP',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  preferredLanguage: {
    type: DataTypes.ENUM('en', 'ar'),
    defaultValue: 'en',
  },
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['organizationId'] },
  ],
});

// Instance method: verify password
User.prototype.verifyPassword = async function (password) {
  if (!this.passwordHash) {return false;}
  return bcrypt.compare(password, this.passwordHash);
};

// Hook: hash password before save
User.beforeSave(async (user) => {
  if (user.changed('passwordHash') && user.passwordHash && !user.passwordHash.startsWith('$2')) {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
  }
});

// Remove sensitive fields from JSON output
User.prototype.toSafeJSON = function () {
  const { passwordHash, nationalId, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;
