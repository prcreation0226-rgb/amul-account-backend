const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE invoiceitem ADD COLUMN batchNo VARCHAR(191), ADD COLUMN mfgDate VARCHAR(191), ADD COLUMN expDate VARCHAR(191)');
    console.log('Columns added successfully');
  } catch (e) {
    if (e.message.includes('Duplicate column name')) {
      console.log('Columns already exist');
    } else {
      console.error(e);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
