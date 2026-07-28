const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:MclowGzSSfWBJBZlNEuhfaxRqsFsxksF@sakura.proxy.rlwy.net:36231/railway"
    }
  }
});

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'swayambillbook@gmail.com' },
      include: { company: true }
    });
    console.log("User found in 'railway' DB:");
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error("Error connecting to 'railway' DB:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
