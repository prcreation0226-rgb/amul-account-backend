const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const defaultVouchersTemplate = [
    { type: 'Company Purchase', voucherId: '45', head: '' },
    { type: 'Customer Sale', voucherId: '134', head: '' },
    { type: 'Customer Sale Return', voucherId: '1', head: '' },
    { type: 'Bank Ledger', voucherId: '6', head: '' },
    { type: 'Customer Challan Invoice', voucherId: '2', head: '' },
    { type: 'Complain Booking', voucherId: '1', head: '' },
    { type: 'Customer Quotation', voucherId: '4', head: '' },
    { type: 'Customer Payment', voucherId: '8', head: '' },
    { type: 'Stock Adjustment', voucherId: '1', head: '' },
    { type: 'Customer Sale Order', voucherId: '3', head: '' },
    { type: 'Company Payment', voucherId: '2', head: '' }
  ];

  const companies = await prisma.company.findMany();
  let addedCount = 0;

  for (const company of companies) {
    const existing = await prisma.voucher.count({ where: { companyId: company.id } });
    if (existing === 0) {
      const vouchers = defaultVouchersTemplate.map(v => ({ ...v, companyId: company.id }));
      await prisma.voucher.createMany({ data: vouchers });
      addedCount += vouchers.length;
    }
  }
  console.log(`Seeded ${addedCount} vouchers across ${companies.length} companies.`);
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
