const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTcs() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { customer: { select: { name: true } } },
      orderBy: { date: 'asc' }
    });
    
    const reportData = invoices.map(inv => {
      const isSales = inv.type === 'SALES' || inv.type === 'SALES_RETURN' || inv.type === 'CHALLAN';
      const isPurchase = inv.type === 'PURCHASE' || inv.type === 'PURCHASE_RETURN';
      
      const tcsAmount = inv.tcsAmount || 0;
      
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        partyName: inv.customer ? inv.customer.name : 'Unknown',
        tcsCollected: isSales ? tcsAmount : 0,
        tcsPaid: isPurchase ? tcsAmount : 0
      };
    });
    
    console.log("Found Invoices:", reportData.length);
    console.log("Sample:", reportData.slice(-2));
  } catch(e) {
    console.error(e);
  } finally {
    prisma.$disconnect();
  }
}
testTcs();
