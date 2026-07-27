const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const startKeep = new Date('2026-07-16T00:00:00.000Z');
  const endKeep = new Date('2026-07-16T23:59:59.999Z');

  try {
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: {
        OR: [
          { date: { lt: startKeep } },
          { date: { gt: endKeep } }
        ]
      }
    });
    console.log(`Successfully deleted ${deletedInvoices.count} records from Day Book (Invoice table).`);
  } catch (error) {
    console.error('Error deleting records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
