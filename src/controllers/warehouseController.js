const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all warehouses for the company
exports.getWarehouses = async (req, res) => {
  const companyId = req.user?.companyId;
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { companyId },
      include: {
        branch: true,
        locRef: true
      }
    });
    res.status(200).json({ success: true, data: warehouses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new warehouse
exports.createWarehouse = async (req, res) => {
  const companyId = req.user?.companyId;
  const { name, location, branchId, locationId, isActive } = req.body;
  try {
    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        location,
        isActive: isActive !== undefined ? isActive : true,
        branchId: branchId ? parseInt(branchId, 10) : null,
        locationId: locationId ? parseInt(locationId, 10) : null,
        companyId
      },
      include: {
        branch: true,
        locRef: true
      }
    });
    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a warehouse
exports.updateWarehouse = async (req, res) => {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  const { name, location, branchId, locationId, isActive } = req.body;
  try {
    const existing = await prisma.warehouse.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(name && { name }),
        ...(location !== undefined && { location }),
        isActive: isActive !== undefined ? isActive : existing.isActive,
        branchId: branchId !== undefined ? (branchId ? parseInt(branchId, 10) : null) : existing.branchId,
        locationId: locationId !== undefined ? (locationId ? parseInt(locationId, 10) : null) : existing.locationId
      },
      include: {
        branch: true,
        locRef: true
      }
    });
    res.status(200).json({ success: true, data: warehouse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a warehouse
exports.deleteWarehouse = async (req, res) => {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  try {
    const existing = await prisma.warehouse.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    await prisma.warehouse.delete({
      where: { id: parseInt(id, 10) }
    });
    res.status(200).json({ success: true, message: 'Warehouse deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
