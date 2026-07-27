const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedClothes() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('No company found.');
      return;
    }

    // Upsert the Clothes category
    let clothesCategory = await prisma.category.findFirst({
      where: { name: 'Clothes', companyId: company.id }
    });

    if (!clothesCategory) {
      clothesCategory = await prisma.category.create({
        data: {
          name: 'Clothes',
          isActive: true,
          companyId: company.id,
          purchaseDiscount: 0,
          saleDiscount: 0,
        }
      });
      console.log('Created Clothes category');
    } else {
      console.log('Clothes category already exists');
    }

    // Delete existing attributes for Clothes to start fresh
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

    console.log('Successfully restored attributes for Clothes!');
  } catch (error) {
    console.error('Error seeding clothes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedClothes();
