const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const templates = await prisma.barcodeTemplate.findMany();
  for (let t of templates) {
    console.log('Template:', t.name);
    console.log(JSON.stringify(t.elements, null, 2));
  }
}
main().finally(() => prisma.$disconnect());
