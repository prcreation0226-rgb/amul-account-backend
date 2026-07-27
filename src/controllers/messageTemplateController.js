const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all message templates
exports.getMessageTemplates = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { type } = req.query;

    let whereClause = { companyId, deletedAt: null };
    if (type) {
      whereClause.type = type;
    }

    const templates = await prisma.messageTemplate.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching message templates:', error);
    res.status(500).json({ error: 'Failed to fetch message templates' });
  }
};

// Create a new message template
exports.createMessageTemplate = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { type, name, content, isActive } = req.body;

    const newTemplate = await prisma.messageTemplate.create({
      data: {
        type: type || 'SMS',
        name,
        content,
        isActive: isActive !== undefined ? isActive : true,
        companyId
      }
    });

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating message template:', error);
    res.status(500).json({ error: 'Failed to create message template' });
  }
};

// Update a message template
exports.updateMessageTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const updates = req.body;

    const template = await prisma.messageTemplate.updateMany({
      where: { id: parseInt(id), companyId },
      data: updates
    });

    if (template.count === 0) {
      return res.status(404).json({ error: 'Message template not found' });
    }

    res.json({ message: 'Message template updated successfully' });
  } catch (error) {
    console.error('Error updating message template:', error);
    res.status(500).json({ error: 'Failed to update message template' });
  }
};

// Soft delete a message template
exports.deleteMessageTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const template = await prisma.messageTemplate.updateMany({
      where: { id: parseInt(id), companyId },
      data: { deletedAt: new Date() }
    });

    if (template.count === 0) {
      return res.status(404).json({ error: 'Message template not found' });
    }

    res.json({ message: 'Message template deleted successfully' });
  } catch (error) {
    console.error('Error deleting message template:', error);
    res.status(500).json({ error: 'Failed to delete message template' });
  }
};
