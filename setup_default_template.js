const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const elements = [
    { id: '1', type: 'text', x: 0, y: 10, width: 280, height: 20, text: 'SWAYAM BILL', fontSize: 12, field: 'Company Name' },
    { id: '2', type: 'text', x: 0, y: 35, width: 280, height: 25, text: 'Product Name', fontSize: 16, field: 'Product Name' },
    { id: '3', type: 'text', x: 0, y: 65, width: 140, height: 20, text: 'MRP: ₹500', fontSize: 12, field: 'MRP' },
    { id: '4', type: 'text', x: 140, y: 65, width: 140, height: 20, text: 'Price: ₹500', fontSize: 12, field: 'Sale Price' },
    { id: '5', type: 'barcode', x: 40, y: 90, width: 200, height: 50, text: '12345678', fontSize: 10 }
  ];

  await prisma.barcodeTemplate.updateMany({
    where: { name: '50mm X 25mm' },
    data: { elements: JSON.stringify(elements) }
  });
  console.log('Restored default 50x25 template elements.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
