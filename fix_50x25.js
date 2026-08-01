const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.barcodeTemplate.updateMany({
    where: { name: '50mm X 25mm' },
    data: { elements: null }
  });
  console.log("Cleared elements for 50mm X 25mm template.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
