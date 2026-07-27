const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: 'amul'
        }
      }
    });
    console.log("Found amul products:", products.map(p => ({id: p.id, name: p.name, deletedAt: p.deletedAt})));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
