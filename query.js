const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { invoiceNo: { startsWith: 'POS' } },
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });
  console.log(JSON.stringify(inv, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
