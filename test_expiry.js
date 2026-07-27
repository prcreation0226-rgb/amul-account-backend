const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      enableExpiry: true,
      expiryMonth: { not: null }
    },
    take: 5,
    select: {
      id: true,
      name: true,
      expiryMonth: true
    }
  });
  console.log("Products with expiry:", products);

  // also query just some random products to see if any have expiryMonth without enableExpiry
  const p2 = await prisma.product.findMany({
    where: { expiryMonth: { not: null } },
    take: 2,
    select: { name: true, expiryMonth: true }
  });
  console.log("Any products with expiryMonth:", p2);
}

main().catch(console.error).finally(() => prisma.$disconnect());
