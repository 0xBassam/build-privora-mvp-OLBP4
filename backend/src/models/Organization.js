const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  nameAr: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'Arabic name for PDPL compliance',
  },
  registrationNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Saudi CR number or equivalent',
  },
  contactEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { isEmail: true },
  },
  contactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  industry: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  pdplOfficerName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Data Protection Officer / PDPL compliance officer',
  },
  pdplOfficerEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  logoUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
}, {
  tableName: 'organizations',
  timestamps: true,
  indexes: [
    { fields: ['registrationNumber'] },
    { fields: ['isActive'] },
  ],
});

module.exports = Organization;
