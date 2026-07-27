const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all categories for the tenant
exports.getCategories = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const categories = await prisma.category.findMany({
      where: { companyId },
      include: {
        attributes: true,
        units: {
          include: { unit: true }
        }
      }
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  const companyId = req.user.companyId;
  const { name, purchaseDiscount, saleDiscount, isActive, attributes, units } = req.body;
  try {
    const category = await prisma.category.create({
      data: {
        name,
        purchaseDiscount: parseFloat(purchaseDiscount) || 0,
        saleDiscount: parseFloat(saleDiscount) || 0,
        isActive: isActive !== false,
        companyId,
        attributes: {
          create: attributes ? attributes.map(attr => ({
            name: attr.name,
            type: attr.type,
            options: attr.options,
            isRequired: attr.isRequired || false,
            order: attr.order || 0
          })) : []
        },
        units: {
          create: units ? units.map(unitId => ({
            unitId: parseInt(unitId, 10)
          })) : []
        }
      },
      include: {
        attributes: true,
        units: { include: { unit: true } }
      }
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update category details
exports.updateCategory = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { name, purchaseDiscount, saleDiscount, isActive, attributes, units } = req.body;
  try {
    const categoryId = parseInt(id, 10);
    
    await prisma.$transaction(async (tx) => {
      // Update basic fields
      await tx.category.update({
        where: { id: categoryId, companyId },
        data: {
          ...(name && { name }),
          ...(purchaseDiscount !== undefined && { purchaseDiscount: parseFloat(purchaseDiscount) }),
          ...(saleDiscount !== undefined && { saleDiscount: parseFloat(saleDiscount) }),
          ...(isActive !== undefined && { isActive })
        }
      });
      
      // Update attributes if provided
      if (attributes) {
        await tx.categoryAttribute.deleteMany({
          where: { categoryId }
        });
        if (attributes.length > 0) {
          await tx.categoryAttribute.createMany({
            data: attributes.map(attr => ({
              categoryId,
              name: attr.name,
              type: attr.type,
              options: attr.options || null,
              isRequired: attr.isRequired || false,
              order: attr.order || 0
            }))
          });
        }
      }
      
      // Update units if provided
      if (units) {
        await tx.categoryUnit.deleteMany({
          where: { categoryId }
        });
        if (units.length > 0) {
          await tx.categoryUnit.createMany({
            data: units.map(unitId => ({
              categoryId,
              unitId: parseInt(unitId, 10)
            }))
          });
        }
      }
    });
    
    const updatedCategory = await prisma.category.findUnique({
      where: { id: categoryId, companyId },
      include: {
        attributes: true,
        units: { include: { unit: true } }
      }
    });

    res.status(200).json({ success: true, data: updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.category.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
