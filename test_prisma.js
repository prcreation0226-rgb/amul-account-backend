const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const settings = await prisma.companySetting.findFirst();
    console.log("Settings:", settings);
    
    // Also try invoice
    const inv = await prisma.invoice.findFirst();
    console.log("Invoice:", inv);
  } catch (err) {
    console.error("Prisma Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
