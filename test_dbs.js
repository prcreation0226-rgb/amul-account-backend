const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe('SHOW DATABASES;');
  console.log(result);
}
main().then(()=>process.exit(0)).catch(console.error);
