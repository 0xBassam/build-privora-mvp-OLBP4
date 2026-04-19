/**
 * Database seed script — creates a sample organization and admin user.
 * Run: node src/scripts/seed.js
 */
require('dotenv').config();
require('../models'); // register associations
const { connectDB } = require('../config/database');
const { User, Organization } = require('../models');

const seed = async () => {
  await connectDB();

  // Create demo organization
  const [org] = await Organization.findOrCreate({
    where: { registrationNumber: 'SA-DEMO-001' },
    defaults: {
      name: 'Privora Demo Organization',
      nameAr: 'مؤسسة بريفورا التجريبية',
      registrationNumber: 'SA-DEMO-001',
      contactEmail: 'admin@privora-demo.sa',
      industry: 'Technology',
      pdplOfficerName: 'Demo PDPL Officer',
      pdplOfficerEmail: 'pdpl@privora-demo.sa',
    },
  });

  console.log(`Organization: ${org.name} (${org.id})`);

  // Create org admin
  const [admin] = await User.findOrCreate({
    where: { email: 'admin@privora-demo.sa' },
    defaults: {
      name: 'Demo Admin',
      email: 'admin@privora-demo.sa',
      role: 'org_admin',
      organizationId: org.id,
      passwordHash: 'Admin@1234',
      isEmailVerified: true,
    },
  });

  console.log(`Admin user: ${admin.email} (password: Admin@1234)`);

  // Create super admin
  const [superAdmin] = await User.findOrCreate({
    where: { email: 'superadmin@privora.sa' },
    defaults: {
      name: 'Super Admin',
      email: 'superadmin@privora.sa',
      role: 'super_admin',
      passwordHash: 'SuperAdmin@1234',
      isEmailVerified: true,
    },
  });

  console.log(`Super admin: ${superAdmin.email} (password: SuperAdmin@1234)`);

  console.log('\nSeed complete!');
  console.log('─────────────────────────────────────────');
  console.log('User Portal:  http://localhost:3000/login');
  console.log('Admin Portal: http://localhost:3000/admin/login');
  console.log('API Docs:     http://localhost:5000/api-docs');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
