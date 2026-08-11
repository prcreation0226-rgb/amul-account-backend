const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 2 }, // Admin of Company 1
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      companyId: true,
      createdAt: true,
      company: {
        select: {
          expireDate: true
        }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
