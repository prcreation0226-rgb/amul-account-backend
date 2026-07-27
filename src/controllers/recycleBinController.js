const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDeletedEntries = async (req, res) => {
  const companyId = req.user.companyId;
  const { type, from, to } = req.query; // type can be Invoice, Product, Customer etc.

  try {
    let deletedEntries = [];
    let dateFilter = { not: null };
    if (from && to) {
      dateFilter = {
        gte: new Date(from),
        lte: new Date(to)
      };
    }

    // Fetch deleted invoices
    const invoices = await prisma.invoice.findMany({
      where: { companyId, deletedAt: dateFilter },
      include: { customer: true }
    });

    invoices.forEach(inv => {
      deletedEntries.push({
        id: inv.id,
        type: 'Invoice',
        date: inv.date,
        voucherNo: inv.invoiceNo,
        particular: inv.customer ? inv.customer.name : 'Cash',
        voucherType: inv.type,
        debit: inv.totalAmount,
        paymentIn: inv.status === 'PAID' ? inv.totalAmount : 0,
        paymentOut: 0,
        discount: inv.totalDiscount,
        deletedOn: inv.deletedAt
      });
    });

    res.status(200).json({ success: true, data: deletedEntries });
  } catch (error) {
    console.error('Error fetching deleted entries:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.restoreEntry = async (req, res) => {
  const companyId = req.user.companyId;
  const { type, id } = req.params;

  try {
    if (type.toLowerCase() === 'invoice') {
      await prisma.invoice.update({
        where: { id: parseInt(id, 10), companyId },
        data: { deletedAt: null }
      });
    }
    // Implement restore for other types if necessary

    res.status(200).json({ success: true, message: 'Entry restored successfully' });
  } catch (error) {
    console.error('Error restoring entry:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.permanentDelete = async (req, res) => {
  const companyId = req.user.companyId;
  const { type, id } = req.params;

  try {
    if (type.toLowerCase() === 'invoice') {
      await prisma.invoice.delete({
        where: { id: parseInt(id, 10), companyId }
      });
    }
    // Implement permanent delete for other types if necessary

    res.status(200).json({ success: true, message: 'Entry permanently deleted' });
  } catch (error) {
    console.error('Error deleting entry permanently:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
