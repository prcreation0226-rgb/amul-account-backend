const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedExpenses() {
  try {
    const company = await prisma.company.findFirst();

    await prisma.expense.create({
      data: {
        name: 'demo 3',
        type: 'General',
        head: 'General',
        companyId: company.id,
        balance: 5000
      }
    });

    await prisma.expense.create({
      data: {
        name: 'Electricity Bill',
        type: 'Utility',
        head: 'Office Expenses',
        companyId: company.id,
        balance: 1200
      }
    });

    console.log('✅ Expenses created!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedExpenses();
