const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanSkus() {
  try {
    const products = await prisma.product.findMany();
    let updatedCount = 0;
    
    for (const product of products) {
      if (product.sku && typeof product.sku === 'string') {
        // Regex to find appended timestamps like -1784615041...
        // We only strip it if it's NOT the standard auto-generated SKU (which starts with SKU-)
        // Actually, let's strip it even if it starts with SKU-? No, standard ones are fine.
        // Wait, if it's a standard one, it was generated because they didn't provide one.
        // Let's strip any suffix that looks like -\d{9,}.*$ from the SKU.
        
        const match = product.sku.match(/(.*?)-\d{9,}.*/);
        if (match) {
          const newSku = match[1];
          // Check if newSku already exists to avoid unique constraint error
          const exists = await prisma.product.findFirst({
            where: { sku: newSku, companyId: product.companyId, id: { not: product.id } }
          });
          
          if (!exists) {
            await prisma.product.update({
              where: { id: product.id },
              data: { sku: newSku }
            });
            updatedCount++;
            console.log(`Updated SKU: ${product.sku} -> ${newSku}`);
          } else {
            console.log(`Could not update ${product.sku} -> ${newSku} (duplicate)`);
          }
        }
      }
    }
    
    console.log(`Finished updating ${updatedCount} SKUs.`);
  } catch (error) {
    console.error('Error cleaning SKUs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSkus();
