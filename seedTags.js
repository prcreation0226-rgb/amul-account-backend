const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('No company found in DB');
    return;
  }
  console.log('Company found:', company.name, '| ID:', company.id);

  const tags = ['Retailer', 'Wholesaler', 'Distributor', 'Regular', 'VIP', 'Walk-in'];

  for (const name of tags) {
    await prisma.partyTag.create({
      data: { name, isActive: true, companyId: company.id }
    });
  }

  const all = await prisma.partyTag.findMany();
  console.log('Tags successfully inserted:');
  all.forEach(t => console.log(' -', t.name));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
