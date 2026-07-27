const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = [
      'company',
      'user',
      'branch',
      'location',
      'warehouse',
      'product',
      'customer',
      'invoice',
      'invoiceItem',
      'expense',
      'payment'
    ];

    console.log('--- DATABASE STATUS ---');
    for (const table of tables) {
      if (prisma[table]) {
        const count = await prisma[table].count();
        console.log(`${table}: ${count} records`);
      }
    }
  } catch (err) {
    console.error('Error counting records:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
