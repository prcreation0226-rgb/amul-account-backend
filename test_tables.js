const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'mysql://root:@localhost:3306/account_db' } }
});

async function main() {
  const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');
  console.log(tables);
  
  // also get count of Expenses, which were shown in the screenshot
  const expCount = await prisma.expense.count();
  console.log('Expenses:', expCount);
}
main().then(()=>process.exit(0)).catch(console.error);
