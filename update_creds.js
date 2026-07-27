const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);

  // Super Admin
  let superadmin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
  if (superadmin) {
    await prisma.user.update({
      where: { id: superadmin.id },
      data: { email: 'superswayambillbook@gmail.com', password: hash }
    });
    console.log('Superadmin updated');
  } else {
    superadmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superswayambillbook@gmail.com',
        password: hash,
        role: 'SUPERADMIN'
      }
    });
    console.log('Superadmin created');
  }

  // Company Admin
  let companyadmin = await prisma.user.findFirst({ where: { role: 'COMPANY_ADMIN' } });
  if (companyadmin) {
    await prisma.user.update({
      where: { id: companyadmin.id },
      data: { email: 'swayambillbook@gmail.com', password: hash }
    });
    console.log('Company Admin updated');
  } else {
    let company = await prisma.company.findFirst();
    if (company) {
      await prisma.user.create({
        data: {
          name: 'Company Admin',
          email: 'swayambillbook@gmail.com',
          password: hash,
          role: 'COMPANY_ADMIN',
          companyId: company.id
        }
      });
      console.log('Company Admin created');
    } else {
      console.log('No company found to attach company admin to.');
    }
  }
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
