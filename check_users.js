const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  // First, find the first company
  const companies = await p.company.findMany();
  console.log('Companies in DB:', JSON.stringify(companies, null, 2));

  let companyId;
  if (companies.length > 0) {
    companyId = companies[0].id;
    console.log('Using existing company:', companies[0].name);
  } else {
    // Create a company if none exists
    const company = await p.company.create({
      data: {
        name: 'Swayam Bill Book Pvt Ltd',
        ownerName: 'Admin',
        ownerEmail: 'company@osbooks.com',
        status: 'ACTIVE'
      }
    });
    companyId = company.id;
    console.log('Created company:', company.name);
  }

  // Check if company admin already exists
  const existing = await p.user.findUnique({ where: { email: 'companyadmin@osbooks.com' } });
  if (existing) {
    console.log('Company Admin already exists! Updating password...');
    const hash = await bcrypt.hash('admin123', 10);
    await p.user.update({ where: { email: 'companyadmin@osbooks.com' }, data: { password: hash } });
    console.log('Password updated!');
  } else {
    const hash = await bcrypt.hash('admin123', 10);
    const user = await p.user.create({
      data: {
        name: 'Company Admin',
        email: 'companyadmin@osbooks.com',
        password: hash,
        role: 'COMPANY_ADMIN',
        companyId: companyId
      }
    });
    console.log('Created Company Admin user:', user.email, 'with companyId:', user.companyId);
  }

  // Show all users
  const allUsers = await p.user.findMany({ select: { id: true, email: true, role: true, companyId: true } });
  console.log('\nAll users:', JSON.stringify(allUsers, null, 2));

  await p.$disconnect();
}

main();
