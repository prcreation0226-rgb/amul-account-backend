const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all branches for the company
exports.getBranches = async (req, res) => {
  const companyId = req.user?.companyId;
  try {
    const branches = await prisma.branch.findMany({
      where: { companyId }
    });
    res.status(200).json({ success: true, data: branches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new branch
exports.createBranch = async (req, res) => {
  const companyId = req.user?.companyId;
  const { name, code, contact, gstin, address, isActive } = req.body;
  try {
    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        contact,
        gstin,
        address,
        isActive: isActive !== undefined ? isActive : true,
        companyId
      }
    });
    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a branch
exports.updateBranch = async (req, res) => {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  const { name, code, contact, gstin, address, isActive } = req.body;
  try {
    const existing = await prisma.branch.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const branch = await prisma.branch.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(contact !== undefined && { contact }),
        ...(gstin !== undefined && { gstin }),
        ...(address !== undefined && { address }),
        ...(isActive !== undefined && { isActive })
      }
    });
    res.status(200).json({ success: true, data: branch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a branch
exports.deleteBranch = async (req, res) => {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  try {
    const existing = await prisma.branch.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    await prisma.branch.delete({
      where: { id: parseInt(id, 10) }
    });
    res.status(200).json({ success: true, message: 'Branch deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
