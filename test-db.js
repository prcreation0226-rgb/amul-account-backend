const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const banks = await prisma.bank.findMany();
  console.log('Banks:', JSON.stringify(banks, null, 2));
  const transactions = await prisma.bankTransaction.findMany();
  console.log('Transactions:', transactions.length);
}
main().finally(() => prisma.$disconnect());
