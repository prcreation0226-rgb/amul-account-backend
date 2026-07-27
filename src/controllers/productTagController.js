const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getProductTags = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const tags = await prisma.productTag.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error('getProductTags error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createProductTag = async (req, res) => {
  const companyId = req.user.companyId;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  try {
    const tag = await prisma.productTag.create({
      data: { name, companyId }
    });
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    console.error('createProductTag error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
