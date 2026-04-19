const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const consentRoutes = require('./consents');
const analyticsRoutes = require('./analytics');
const dataSharingRoutes = require('./dataSharing');
const dsarRoutes = require('./dsar');
const breachRoutes = require('./breaches');
const retentionRoutes = require('./retention');
const privacyNoticeRoutes = require('./privacyNotices');
const purposeRoutes = require('./purposes');
const ropaRoutes = require('./ropa');
const dpiaRoutes = require('./dpia');
const sensitiveDataRoutes = require('./sensitiveData');
const disclosureRoutes = require('./disclosure');
const destructionRoutes = require('./destruction');
const { success } = require('../utils/response');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  return success(res, {
    status: 'healthy',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/consents', consentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/data-sharing', dataSharingRoutes);
router.use('/dsar', dsarRoutes);
router.use('/breaches', breachRoutes);
router.use('/retention', retentionRoutes);
router.use('/privacy-notices', privacyNoticeRoutes);
router.use('/purposes', purposeRoutes);
router.use('/ropa', ropaRoutes);
router.use('/dpia', dpiaRoutes);
router.use('/sensitive-data', sensitiveDataRoutes);
router.use('/disclosure', disclosureRoutes);
router.use('/destruction', destructionRoutes);

module.exports = router;
