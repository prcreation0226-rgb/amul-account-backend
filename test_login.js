const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function check() {
  const email = 'superswayambillbook@gmail.com';
  const password = '123456';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found');
    return;
  }
  const isMatch = await bcrypt.compare(password, user.password);
  console.log('User found:', user.email, 'Password match:', isMatch);
}

check().then(() => prisma.$disconnect());
