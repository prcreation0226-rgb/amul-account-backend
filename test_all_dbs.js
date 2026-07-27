const { PrismaClient } = require('@prisma/client');
const dbs = ['account_db', 'field_service', 'tentant_db', 'os_booking', 'tractor'];

async function checkDb(dbName) {
  try {
    const prisma = new PrismaClient({
      datasources: { db: { url: `mysql://root:@localhost:3306/${dbName}` } }
    });
    const c = await prisma.company.count();
    const u = await prisma.user.count();
    const s = await prisma.companySetting.count();
    console.log(`DB: ${dbName} | Company: ${c} | User: ${u} | Settings: ${s}`);
    await prisma.$disconnect();
  } catch (e) {
    // console.error(`DB: ${dbName} | Error: ${e.message.split('\n')[0]}`);
  }
}

async function main() {
  for (const db of dbs) {
    await checkDb(db);
  }
}
main().then(()=>process.exit(0)).catch(console.error);
