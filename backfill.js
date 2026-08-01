const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillPOS() {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { type: 'SALES' }
    });

    const banks = await prisma.bank.findMany();
    let updatedCount = 0;

    for (const inv of invoices) {
      if (!inv.paymentMode) continue;
      
      const modes = inv.paymentMode.split(',');
      for (const m of modes) {
        if (!m.includes(':')) continue;
        const [modeStr, amountStr] = m.split(':');
        const amt = parseFloat(amountStr);
        if (amt <= 0 || modeStr.toLowerCase() === 'credit') continue;

        const pModeLower = modeStr.toLowerCase();
        let targetBank;
        if (pModeLower === 'cash') {
          targetBank = banks.find(b => (b.type || '').toLowerCase().includes('cash') || (b.name || '').toLowerCase().includes('cash'));
        } else {
          targetBank = banks.find(b => (b.name || '').toLowerCase().includes(pModeLower) || pModeLower.includes((b.name || '').toLowerCase()));
        }
        if (!targetBank && banks.length > 0) targetBank = banks[0];

        if (targetBank) {
          // Check if this specific invoice is already backfilled for this mode
          const remarkMatch = `${modeStr} POS Sale - ${inv.invoiceNo}`;
          const existingTx = await prisma.bankTransaction.findFirst({
            where: { remark: remarkMatch }
          });

          if (!existingTx) {
            await prisma.bankTransaction.create({
              data: {
                date: inv.date,
                toBankId: targetBank.id,
                amount: amt,
                remark: remarkMatch,
                companyId: targetBank.companyId
              }
            });
            await prisma.bank.update({
              where: { id: targetBank.id },
              data: { balance: { increment: amt } }
            });
            updatedCount++;
          }
        }
      }
    }
    console.log(`Successfully backfilled ${updatedCount} missing POS bank transactions.`);
  } catch (error) {
    console.error("Error backfilling POS:", error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillPOS();
