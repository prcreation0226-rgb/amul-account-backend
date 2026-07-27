const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: "Fashion",
    attributes: [
      { name: "Size", type: "Multi Select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
      { name: "Color", type: "Multi Select", options: ["Black", "White", "Blue", "Red", "Green", "Yellow"] },
      { name: "Fabric", type: "Dropdown", options: ["Cotton", "Linen", "Denim", "Silk", "Polyester"] },
      { name: "Brand", type: "Text", options: [] }
    ]
  },
  {
    name: "Footwear",
    attributes: [
      { name: "Size", type: "Multi Select", options: ["5", "6", "7", "8", "9", "10", "11"] },
      { name: "Color", type: "Multi Select", options: ["Black", "Brown", "White", "Blue"] },
      { name: "Material", type: "Dropdown", options: ["Leather", "Canvas", "Rubber", "Mesh"] }
    ]
  },
  {
    name: "Mobile",
    attributes: [
      { name: "RAM", type: "Dropdown", options: ["4GB", "6GB", "8GB", "12GB", "16GB"] },
      { name: "Storage", type: "Dropdown", options: ["64GB", "128GB", "256GB", "512GB", "1TB"] },
      { name: "Color", type: "Multi Select", options: ["Black", "Blue", "Silver", "Gold", "Green"] },
      { name: "IMEI", type: "Text", options: [] }
    ]
  },
  {
    name: "Electronics",
    attributes: [
      { name: "Voltage", type: "Dropdown", options: ["110V", "220V"] },
      { name: "Warranty", type: "Dropdown", options: ["6 Months", "1 Year", "2 Years", "3 Years"] },
      { name: "Brand", type: "Text", options: [] }
    ]
  },
  {
    name: "Grocery",
    attributes: [
      { name: "Unit", type: "Dropdown", options: ["Kg", "Gram", "Litre", "ml", "Packet", "Piece"] },
      { name: "Weight", type: "Text", options: [] }
    ]
  },
  {
    name: "Medical",
    attributes: [
      { name: "Batch No", type: "Text", options: [] },
      { name: "Expiry Date", type: "Text", options: [] },
      { name: "Manufacturer", type: "Text", options: [] }
    ]
  },
  {
    name: "Cosmetics",
    attributes: [
      { name: "Shade", type: "Multi Select", options: ["Light", "Medium", "Dark"] },
      { name: "Size", type: "Dropdown", options: ["50ml", "100ml", "200ml"] }
    ]
  },
  {
    name: "Furniture",
    attributes: [
      { name: "Material", type: "Dropdown", options: ["Wood", "Steel", "Plastic", "Glass"] },
      { name: "Color", type: "Multi Select", options: ["Brown", "Black", "White"] }
    ]
  }
];

async function seed() {
  try {
    // Assuming companyId = 1 for the main tenant, adjust if needed
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('No company found to seed categories into.');
      return;
    }

    console.log(`Seeding categories for Company ID: ${company.id}...`);

    for (const cat of defaultCategories) {
      // 1. Create Category
      const createdCategory = await prisma.category.create({
        data: {
          name: cat.name,
          isActive: true,
          companyId: company.id,
          purchaseDiscount: 0,
          saleDiscount: 0,
        }
      });
      console.log(`Created Category: ${cat.name}`);

      // 2. Add Attributes
      let order = 1;
      for (const attr of cat.attributes) {
        await prisma.categoryAttribute.create({
          data: {
            categoryId: createdCategory.id,
            name: attr.name,
            type: attr.type,
            options: attr.options.length > 0 ? attr.options : null,
            isRequired: false,
            order: order++
          }
        });
      }
    }

    console.log('Successfully seeded all default categories and attributes!');
  } catch (error) {
    console.error('Error seeding categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
