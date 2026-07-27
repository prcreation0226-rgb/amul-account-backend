const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    // Find clothes category
    const clothesCategory = await prisma.category.findFirst({
      where: { name: { contains: 'Clothes' } }
    });

    if (!clothesCategory) {
      console.log('Clothes category not found');
      return;
    }

    console.log('Found clothes category, adding attributes...');

    // Delete existing to prevent duplicates
    await prisma.categoryAttribute.deleteMany({
      where: { categoryId: clothesCategory.id }
    });

    // Add Size
    await prisma.categoryAttribute.create({
      data: {
        categoryId: clothesCategory.id,
        name: 'Size',
        type: 'Multi Select',
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
        isRequired: true,
        order: 1
      }
    });

    // Add Color
    await prisma.categoryAttribute.create({
      data: {
        categoryId: clothesCategory.id,
        name: 'Color',
        type: 'Multi Select',
        options: ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Pink'],
        isRequired: true,
        order: 2
      }
    });

    console.log('Successfully seeded attributes for Clothes!');
  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
