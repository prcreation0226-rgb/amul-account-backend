const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.barcodeTemplate.findMany();
  console.log("Templates found:", templates.length);
  for (let t of templates) {
    console.log(t.name, typeof t.elements);
    if (typeof t.elements === 'string') {
      console.log("Found double stringified elements for:", t.name);
      try {
        const parsed = JSON.parse(t.elements);
        await prisma.barcodeTemplate.update({
          where: { id: t.id },
          data: { elements: parsed }
        });
        console.log("Fixed:", t.name);
      } catch (e) {
        console.log("Error parsing:", e.message);
      }
    }
  }
}

main().catch(console.error).finally(() => { prisma.$disconnect(); });
