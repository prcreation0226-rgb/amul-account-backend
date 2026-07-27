const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedUser() {
  try {
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Create Company
    const company = await prisma.company.create({
      data: {
        name: 'My Company',
        ownerName: 'Admin',
        ownerEmail: 'admin@gmail.com',
        status: 'ACTIVE'
      }
    });

    // Create Settings
    await prisma.companySetting.create({
      data: { companyId: company.id }
    });

    // Create User
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'COMPANY_ADMIN',
        companyId: company.id
      }
    });

    // Recreate demo expenses
    await prisma.expense.create({
      data: {
        name: 'demo 3',
        description: 'Test expense',
        type: 'General',
        companyId: company.id
      }
    });

    await prisma.expense.create({
      data: {
        name: 'Electricity Bill',
        description: 'Monthly electricity bill',
        type: 'Utility',
        companyId: company.id
      }
    });

    console.log('✅ Default Company and User created!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedUser();
