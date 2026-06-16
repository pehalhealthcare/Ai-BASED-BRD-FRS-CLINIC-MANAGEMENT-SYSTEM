const { connectDB, disconnectDB } = require('../config/database');
const { env } = require('../config/env');
const { ROLES } = require('../common/constants/roles');
const { logger } = require('../common/utils/logger');
const userRepository = require('../modules/users/user.repository');
const { createAuditLog } = require('../modules/audit/audit.service');

const seedAdmin = async (overrides = {}) => {
  const seedName = overrides.name || env.seedAdminName;
  const seedEmail = overrides.email || env.seedAdminEmail;
  const seedPassword = overrides.password || env.seedAdminPassword;

  if (!seedName || !seedEmail || !seedPassword) {
    throw new Error('SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD are required for admin seeding.');
  }

  await connectDB();

  const existingAdmin = await userRepository.findByEmail(seedEmail);

  if (existingAdmin) {
    logger.info(`SUPER_ADMIN already exists for ${seedEmail}`);
    await disconnectDB();
    return existingAdmin;
  }

  const admin = await userRepository.createUser({
    name: seedName,
    email: seedEmail,
    password: seedPassword,
    role: ROLES.SUPER_ADMIN,
    isActive: true
  });

  await createAuditLog({
    actorUserId: admin._id,
    action: 'ADMIN_SEEDED',
    entity: 'User',
    entityId: admin._id,
    metadata: {
      email: admin.email,
      role: admin.role
    },
    status: 'SUCCESS'
  });

  logger.info(`SUPER_ADMIN seeded successfully for ${admin.email}`);
  await disconnectDB();
  return admin;
};

if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch(async (error) => {
      logger.error('Admin seed failed.', error);
      await disconnectDB();
      process.exit(1);
    });
}

module.exports = { seedAdmin };
