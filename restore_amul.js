const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const updated = await prisma.product.updateMany({
      where: {
        name: 'amul butter'
      },
      data: {
        deletedAt: null,
        status: 'Active'
      }
    });
    console.log(`Successfully restored ${updated.count} products.`);
  } catch (error) {
    console.error('Error restoring:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
