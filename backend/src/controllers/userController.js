const { User, Organization } = require('../models');
const { success, notFound, badRequest } = require('../utils/response');

/**
 * GET /api/v1/users/me
 * Return authenticated user's profile.
 */
const getMe = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'logoUrl'] }],
  });
  if (!user) {return notFound(res, 'User not found');}
  return success(res, { user: user.toSafeJSON() });
};

/**
 * PATCH /api/v1/users/me
 * Update authenticated user's profile.
 */
const updateMe = async (req, res) => {
  const { name, phone, preferredLanguage } = req.body;
  const user = req.user;

  const updates = {};
  if (name) {updates.name = name;}
  if (phone !== undefined) {updates.phone = phone;}
  if (preferredLanguage) {updates.preferredLanguage = preferredLanguage;}

  await user.update(updates);
  return success(res, { user: user.toSafeJSON() }, 'Profile updated');
};

module.exports = { getMe, updateMe };
