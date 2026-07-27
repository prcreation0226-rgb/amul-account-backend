const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE attendance DROP INDEX attendance_employeeId_date_key;');
    console.log('Index dropped successfully.');
  } catch (err) {
    console.error('Error dropping index:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
