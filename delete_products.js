const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const updatedProducts = await prisma.product.updateMany({
      where: {
        name: {
          not: 'amul butter'
        }
      },
      data: {
        deletedAt: new Date()
      }
    });
    console.log(`Successfully soft deleted ${updatedProducts.count} products.`);
  } catch (error) {
    console.error('Error updating products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
