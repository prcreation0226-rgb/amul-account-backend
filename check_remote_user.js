const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:MclowGzSSfWBJBZlNEuhfaxRqsFsxksF@sakura.proxy.rlwy.net:36231/railwaychec"
    }
  }
});

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'swayambillbook@gmail.com' }
    });
    console.log("User found:", user);
  } catch (error) {
    console.error("Error connecting to DB:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
