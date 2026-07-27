const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all vouchers for the tenant
exports.getVouchers = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const vouchers = await prisma.voucher.findMany({
      where: { companyId }
    });
    res.status(200).json({ success: true, data: vouchers });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new voucher
exports.createVoucher = async (req, res) => {
  const companyId = req.user.companyId;
  const { voucherId, type, head } = req.body;
  try {
    const voucher = await prisma.voucher.create({
      data: {
        voucherId,
        type,
        head,
        companyId
      }
    });
    res.status(201).json({ success: true, data: voucher });
  } catch (error) {
    console.error('Error creating voucher:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update a voucher
exports.updateVoucher = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { voucherId, type, head } = req.body;
  try {
    const voucher = await prisma.voucher.update({
      where: { id: parseInt(id, 10), companyId },
      data: {
        voucherId,
        type,
        head
      }
    });
    res.status(200).json({ success: true, data: voucher });
  } catch (error) {
    console.error('Error updating voucher:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a voucher
exports.deleteVoucher = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.voucher.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'Voucher deleted successfully' });
  } catch (error) {
    console.error('Error deleting voucher:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
