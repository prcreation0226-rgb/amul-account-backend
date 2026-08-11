const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.invoiceItem.findMany({
    take: 5,
    orderBy: { id: 'desc' }
  });
  console.log(JSON.stringify(items, null, 2));
}

main().finally(() => prisma.$disconnect());
