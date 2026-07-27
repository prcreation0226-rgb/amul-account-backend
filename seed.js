const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@osbooks.com' }
    });

    if (existingAdmin) {
      console.log('Superadmin already exists. Skipping seed.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('securepassword', 10);

    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@osbooks.com',
        password: hashedPassword,
        role: 'SUPERADMIN',
        // companyId is null for Superadmin
      }
    });

    console.log('✅ Superadmin created: admin@osbooks.com / securepassword');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed', error);
    process.exit(1);
  }
}

seed();
