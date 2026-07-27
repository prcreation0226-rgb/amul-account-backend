const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all locations for the company
exports.getLocations = async (req, res) => {
  const companyId = req.user?.companyId;
  try {
    const locations = await prisma.location.findMany({
      where: { companyId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new location
exports.createLocation = async (req, res) => {
  const companyId = req.user?.companyId;
  const { name, code, address, branchId, isActive } = req.body;
  try {
    if (!name || !branchId) {
      return res.status(400).json({ success: false, message: 'Location name and Branch are required' });
    }
    const location = await prisma.location.create({
      data: {
        name,
        code,
        address,
        branchId: parseInt(branchId, 10),
        isActive: isActive !== undefined ? isActive : true,
        companyId
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a location
exports.updateLocation = async (req, res) => {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  const { name, code, address, branchId, isActive } = req.body;
  try {
    const existing = await prisma.location.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const location = await prisma.location.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(address !== undefined && { address }),
        ...(branchId !== undefined && { branchId: parseInt(branchId, 10) }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
    res.status(200).json({ success: true, data: location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a location
exports.deleteLocation = async (req, res) => {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  try {
    const existing = await prisma.location.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    await prisma.location.delete({
      where: { id: parseInt(id, 10) }
    });
    res.status(200).json({ success: true, message: 'Location deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
