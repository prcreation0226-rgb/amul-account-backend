const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getCommissionTypes = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const types = await prisma.commissionType.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    console.error('getCommissionTypes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCommissionType = async (req, res) => {
  const companyId = req.user.companyId;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  try {
    const type = await prisma.commissionType.create({
      data: { name, companyId }
    });
    res.status(201).json({ success: true, data: type });
  } catch (error) {
    console.error('createCommissionType error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
