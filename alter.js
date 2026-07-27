const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$executeRawUnsafe('ALTER TABLE product ADD COLUMN rawMaterials JSON NULL, ADD COLUMN extraCharges JSON NULL, ADD COLUMN subItems JSON NULL, ADD COLUMN subInventory JSON NULL;')
  .then(() => console.log('success'))
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
