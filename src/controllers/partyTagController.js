const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all party tags for the tenant
exports.getPartyTags = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const tags = await prisma.partyTag.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new party tag
exports.createPartyTag = async (req, res) => {
  const companyId = req.user.companyId;
  const { name, isActive } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Tag name is required' });
  }
  try {
    const tag = await prisma.partyTag.create({
      data: { name: name.trim(), isActive: isActive !== false, companyId }
    });
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a party tag
exports.updatePartyTag = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { name, isActive } = req.body;
  try {
    const tag = await prisma.partyTag.update({
      where: { id: parseInt(id, 10), companyId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(isActive !== undefined && { isActive })
      }
    });
    res.status(200).json({ success: true, data: tag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a party tag
exports.deletePartyTag = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.partyTag.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'Party tag deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
