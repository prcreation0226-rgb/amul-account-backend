require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPlans() {
  try {
    const existing = await prisma.subscriptionPlan.findFirst();
    if (existing) {
      console.log('Plans already exist. Skipping.');
      process.exit(0);
    }

    await prisma.subscriptionPlan.createMany({
      data: [
        {
          name: 'Basic',
          price: 499,
          features: JSON.stringify({ invoices: 100, users: 2, storage: '1GB' }),
        },
        {
          name: 'Pro',
          price: 1499,
          features: JSON.stringify({ invoices: 1000, users: 10, storage: '10GB' }),
        },
        {
          name: 'Enterprise',
          price: 4999,
          features: JSON.stringify({ invoices: 'Unlimited', users: 'Unlimited', storage: '100GB' }),
        },
      ],
    });

    console.log('✅ Plans seeded: Basic, Pro, Enterprise');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding plans failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPlans();
