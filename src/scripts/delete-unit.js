const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteBox1() {
  try {
    const deleted = await prisma.unit.deleteMany({
      where: { name: 'box1' }
    });
    console.log('Deleted units:', deleted.count);
  } catch (error) {
    console.error('Error deleting unit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBox1();
