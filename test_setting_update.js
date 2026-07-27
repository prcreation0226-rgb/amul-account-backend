const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  try {
    const updated = await prisma.companySetting.upsert({
      where: { companyId: 1 },
      update: { currency: "USD" },
      create: { companyId: 1, currency: "USD" }
    });
    console.log(updated);
  } catch (e) {
    console.error(e.message);
  }
}

testUpdate().finally(() => prisma.$disconnect());
