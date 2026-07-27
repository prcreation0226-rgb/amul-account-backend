const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:@localhost:3306/tentant_db",
    },
  },
});

async function main() {
  try {
    console.log("Users:", await prisma.user.count());
  } catch (e) {
    console.error(e.message);
  }
}
main().then(()=>process.exit(0)).catch(console.error);
