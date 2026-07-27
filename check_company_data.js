const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const companies = await prisma.company.findMany();
    for (const comp of companies) {
      console.log(`\nCompany: ${comp.name} (ID: ${comp.id})`);
      const users = await prisma.user.count({ where: { companyId: comp.id } });
      const products = await prisma.product.count({ where: { companyId: comp.id } });
      const invoices = await prisma.invoice.count({ where: { companyId: comp.id } });
      console.log(` - Users: ${users}`);
      console.log(` - Products: ${products}`);
      console.log(` - Invoices: ${invoices}`);
    }
  } catch (err) {
    console.error('Error grouping data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
