const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all service reminders
exports.getServiceReminders = async (req, res) => {
  try {
    const { status, dateFilter } = req.query;
    const companyId = req.user.companyId;

    let whereClause = { companyId, deletedAt: null };

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    const reminders = await prisma.serviceReminder.findMany({
      where: whereClause,
      orderBy: { serviceDate: 'asc' }
    });

    res.json(reminders);
  } catch (error) {
    console.error('Error fetching service reminders:', error);
    res.status(500).json({ error: 'Failed to fetch service reminders' });
  }
};

// Create a new service reminder
exports.createServiceReminder = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      partyName,
      productName,
      contactPerson,
      mobileNo,
      serviceDate,
      note,
      status
    } = req.body;

    const newReminder = await prisma.serviceReminder.create({
      data: {
        partyName,
        productName,
        contactPerson,
        mobileNo,
        serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
        note,
        status: status || 'Pending',
        companyId
      }
    });

    res.status(201).json(newReminder);
  } catch (error) {
    console.error('Error creating service reminder:', error);
    res.status(500).json({ error: 'Failed to create service reminder' });
  }
};

// Update a service reminder
exports.updateServiceReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const updates = req.body;

    if (updates.serviceDate) {
      updates.serviceDate = new Date(updates.serviceDate);
    }

    const reminder = await prisma.serviceReminder.updateMany({
      where: { id: parseInt(id), companyId },
      data: updates
    });

    if (reminder.count === 0) {
      return res.status(404).json({ error: 'Service reminder not found' });
    }

    res.json({ message: 'Service reminder updated successfully' });
  } catch (error) {
    console.error('Error updating service reminder:', error);
    res.status(500).json({ error: 'Failed to update service reminder' });
  }
};

// Soft delete a service reminder
exports.deleteServiceReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const reminder = await prisma.serviceReminder.updateMany({
      where: { id: parseInt(id), companyId },
      data: { deletedAt: new Date() }
    });

    if (reminder.count === 0) {
      return res.status(404).json({ error: 'Service reminder not found' });
    }

    res.json({ message: 'Service reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting service reminder:', error);
    res.status(500).json({ error: 'Failed to delete service reminder' });
  }
};
