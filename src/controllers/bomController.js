const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all BOM masters for the tenant
exports.getBoms = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const boms = await prisma.bom.findMany({
      where: { companyId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    res.status(200).json({ success: true, data: boms });
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new BOM master
exports.createBom = async (req, res) => {
  const companyId = req.user.companyId;
  const { name, isActive, items } = req.body;
  try {
    const bom = await prisma.bom.create({
      data: {
        name,
        isActive: isActive !== false,
        companyId,
        items: {
          create: (items || []).map(item => ({
            productId: parseInt(item.productId, 10),
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'Units',
            salePrice: parseFloat(item.salePrice) || 0,
            mrp: parseFloat(item.mrp) || 0,
            wholesale: parseFloat(item.wholesale) || 0
          }))
        }
      },
      include: {
        items: true
      }
    });
    res.status(201).json({ success: true, data: bom });
  } catch (error) {
    console.error('Error creating BOM:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a BOM master
exports.deleteBom = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.bom.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'BOM deleted successfully' });
  } catch (error) {
    console.error('Error deleting BOM:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update a BOM master
exports.updateBom = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { name, isActive, items } = req.body;
  try {
    const updateData = {
      isActive: isActive !== false
    };
    if (name !== undefined) updateData.name = name;

    if (items !== undefined) {
      // Delete existing items first only if we are updating items
      await prisma.bomItem.deleteMany({
        where: { bomId: parseInt(id, 10) }
      });
      updateData.items = {
        create: items.map(item => ({
          productId: parseInt(item.productId, 10),
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit || 'Units',
          salePrice: parseFloat(item.salePrice) || 0,
          mrp: parseFloat(item.mrp) || 0,
          wholesale: parseFloat(item.wholesale) || 0
        }))
      };
    }

    const bom = await prisma.bom.update({
      where: { id: parseInt(id, 10), companyId },
      data: updateData,
      include: {
        items: true
      }
    });
    res.status(200).json({ success: true, data: bom });
  } catch (error) {
    console.error('Error updating BOM:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
