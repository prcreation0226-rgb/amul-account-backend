require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function testCreate() {
  const name = 'Test Company';
  const ownerEmail = 'testowner_' + Date.now() + '@example.com';
  const ownerName = 'Test Owner';
  const planId = null;

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingUser) {
      console.log('Email already in use');
      return;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    const newCompany = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name,
          ownerName,
          ownerEmail,
          planId: planId ? parseInt(planId) : null,
        }
      });

      await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          password: hashedPassword,
          role: 'COMPANY_ADMIN',
          companyId: company.id
        }
      });

      return company;
    });

    console.log('SUCCESS: Created company id', newCompany.id);

    // Cleanup
    await prisma.user.delete({ where: { email: ownerEmail } });
    await prisma.company.delete({ where: { id: newCompany.id } });
    console.log('Cleanup done');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('Code:', e.code);
    console.error('Meta:', JSON.stringify(e.meta));
  } finally {
    await prisma.$disconnect();
  }
}

testCreate();
