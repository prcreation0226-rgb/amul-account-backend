const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// Get settings for the current user's company
exports.getSettings = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(200).json({ 
        success: true, 
        data: {
          printHeader: null,
          printFooter: null,
          showLogo: true,
          paperSize: 'A4',
          fontSize: 'medium',
          currency: 'INR',
          dateFormat: 'DD-MM-YYYY',
        }
      });
    }

    let settings = await prisma.companySetting.findUnique({
      where: { companyId }
    });

    // If no settings exist yet, return a safe default object without trying to create
    if (!settings) {
      settings = {
        companyId,
        printHeader: null,
        printFooter: null,
        showLogo: true,
        paperSize: 'A4',
        fontSize: 'medium',
        currency: 'INR',
        dateFormat: 'DD-MM-YYYY',
      };
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: "No company associated with this user" });
    }
    const updates = req.body;

    // Optional: Filter out properties that are not allowed to be updated directly
    delete updates.id;
    delete updates.companyId;
    delete updates.showIMEI; // Not in Prisma schema
    delete updates.showFreeQty; // Not in Prisma schema
    delete updates.manageVariants; // Not in Prisma schema

    const updatedSettings = await prisma.companySetting.upsert({
      where: { companyId },
      update: updates,
      create: {
        companyId,
        ...updates
      }
    });

    res.status(200).json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ success: false, error: "Failed to update settings" });
  }
};

// Reset database for company
exports.resetDatabase = async (req, res) => {
  try {
    const { password, deleteMasterData } = req.body;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'No company associated with this user' });
    }

    // Verify admin password
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'SUPERADMIN' && user.role !== 'COMPANY_ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to reset database' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    // Delete transaction data
    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoice: { companyId } } });
      await tx.invoice.deleteMany({ where: { companyId } });
      await tx.voucherItem.deleteMany({ where: { voucher: { companyId } } });
      await tx.voucher.deleteMany({ where: { companyId } });
      await tx.saleOrder.deleteMany({ where: { companyId } });
      await tx.purchaseOrder.deleteMany({ where: { companyId } });
      await tx.deliveryChallan.deleteMany({ where: { companyId } });
      await tx.return.deleteMany({ where: { companyId } });
      await tx.stockTransfer.deleteMany({ where: { companyId } });
      await tx.stockAdjustment.deleteMany({ where: { companyId } });
      await tx.expense.deleteMany({ where: { companyId } });
      await tx.billItem.deleteMany({ where: { bill: { companyId } } });
      await tx.bill.deleteMany({ where: { companyId } });
      await tx.paymentOut.deleteMany({ where: { companyId } });
      await tx.paymentIn.deleteMany({ where: { companyId } });
      await tx.cheque.deleteMany({ where: { companyId } });
      await tx.employeeTransaction.deleteMany({ where: { companyId } });

      // If deleteMasterData is true
      if (deleteMasterData) {
        await tx.product.deleteMany({ where: { companyId } });
        await tx.customer.deleteMany({ where: { companyId } });
        await tx.vendor.deleteMany({ where: { companyId } });
        await tx.employee.deleteMany({ where: { companyId } });
        await tx.bankAccount.deleteMany({ where: { companyId } });
        await tx.store.deleteMany({ where: { companyId } });
      }
    });

    res.status(200).json({ success: true, message: 'Database reset successfully' });
  } catch (error) {
    console.error('Reset database error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
