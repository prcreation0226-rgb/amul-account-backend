const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createUnit = async (req, res) => {
  try {
    const { name, uqc, value, compareTo } = req.body;
    const companyId = req.user.companyId;

    if (!name || !uqc) {
      return res.status(400).json({ success: false, message: 'Name and GST UQC are required' });
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        uqc,
        value: value || '1',
        compareTo: compareTo || '—',
        companyId
      }
    });

    res.status(201).json({ success: true, message: 'Unit created successfully', data: unit });
  } catch (error) {
    console.error('Create Unit Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getUnits = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const units = await prisma.unit.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: units });
  } catch (error) {
    console.error('Get Units Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, uqc, value, compareTo } = req.body;
    const companyId = req.user.companyId;

    const existingUnit = await prisma.unit.findFirst({
      where: { id: parseInt(id), companyId }
    });

    if (!existingUnit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const updatedUnit = await prisma.unit.update({
      where: { id: parseInt(id) },
      data: {
        name,
        uqc,
        value: value || '1',
        compareTo: compareTo || '—'
      }
    });

    res.status(200).json({ success: true, message: 'Unit updated successfully', data: updatedUnit });
  } catch (error) {
    console.error('Update Unit Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const existingUnit = await prisma.unit.findFirst({
      where: { id: parseInt(id), companyId }
    });

    if (!existingUnit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    await prisma.unit.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ success: true, message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Delete Unit Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
