const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const startKeep = new Date('2026-07-14T00:00:00.000Z');
  const endKeep = new Date('2026-07-15T23:59:59.999Z');

  try {
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: {
        type: 'PURCHASE',
        OR: [
          { date: { lt: startKeep } },
          { date: { gt: endKeep } }
        ]
      }
    });
    console.log(`Successfully deleted ${deletedInvoices.count} purchase records.`);
  } catch (error) {
    console.error('Error deleting records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
