const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all barcode templates for the company
exports.getBarcodeSettings = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const templates = await prisma.barcodeTemplate.findMany({
      where: { companyId },
      orderBy: { id: 'asc' }
    });
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new barcode template
exports.createBarcodeSetting = async (req, res) => {
  const companyId = req.user.companyId;
  const data = req.body;
  if (!data.name || data.name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Template name is required' });
  }
  try {
    const template = await prisma.barcodeTemplate.create({
      data: {
        ...data,
        name: data.name.trim(),
        companyId
      }
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update an existing barcode template
exports.updateBarcodeSetting = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { pageType, zeroPrice, showAutoQuantity, ...data } = req.body;
  try {
    const template = await prisma.barcodeTemplate.update({
      where: { id: parseInt(id, 10), companyId },
      data: {
        ...data,
        companyId: undefined, // ensure companyId is not overwritten
        id: undefined // ensure id is not overwritten
      }
    });
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a barcode template
exports.deleteBarcodeSetting = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.barcodeTemplate.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'Barcode template deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
