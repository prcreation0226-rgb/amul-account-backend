const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE company ADD COLUMN phone VARCHAR(191) DEFAULT NULL`);
  } catch (e) { console.log(e.message); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE company ADD COLUMN address VARCHAR(191) DEFAULT NULL`);
  } catch (e) { console.log(e.message); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE company ADD COLUMN startDate DATETIME(3) DEFAULT NULL`);
  } catch (e) { console.log(e.message); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE company ADD COLUMN expireDate DATETIME(3) DEFAULT NULL`);
  } catch (e) { console.log(e.message); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE company ADD COLUMN planType VARCHAR(191) DEFAULT NULL`);
  } catch (e) { console.log(e.message); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE company ADD COLUMN logo LONGTEXT DEFAULT NULL`);
  } catch (e) { console.log(e.message); }
  console.log("Success");
  await prisma.$disconnect();
}
main();
