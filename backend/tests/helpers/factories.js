/**
 * Test data factories — create consistent test fixtures.
 */
const { v4: uuidv4 } = require('uuid');

const makeUser = (overrides = {}) => ({
  email: `user-${uuidv4().slice(0, 8)}@test.com`,
  name: 'Test User',
  role: 'user',
  isEmailVerified: true,
  isActive: true,
  ...overrides,
});

const makeAdmin = (organizationId, overrides = {}) => ({
  email: `admin-${uuidv4().slice(0, 8)}@test.com`,
  name: 'Test Admin',
  role: 'org_admin',
  organizationId,
  passwordHash: 'TestPass@123',
  isEmailVerified: true,
  isActive: true,
  ...overrides,
});

const makeOrganization = (overrides = {}) => ({
  name: 'Test Organization',
  contactEmail: `org-${uuidv4().slice(0, 8)}@test.com`,
  isActive: true,
  ...overrides,
});

const makeConsentRequest = (organizationId, createdBy, overrides = {}) => ({
  organizationId,
  createdBy,
  title: 'Test Consent Request',
  description: 'This is a test consent request for unit testing purposes',
  dataTypes: ['email', 'name'],
  purpose: 'Testing the consent management system',
  legalBasis: 'consent',
  isActive: true,
  ...overrides,
});

module.exports = { makeUser, makeAdmin, makeOrganization, makeConsentRequest };
