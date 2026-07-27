const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.product.create({ data: { name: 'test', sku: 'test-123', companyId: 1, rawMaterials: [] } })
  .then(() => console.log('success'))
  .catch(e => console.error(e.message))
  .finally(() => prisma.$disconnect());
