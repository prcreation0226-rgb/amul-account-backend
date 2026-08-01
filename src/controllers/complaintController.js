const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all complaints for the logged-in user's company
exports.getComplaints = async (req, res) => {
  try {
    const { status, dateFilter } = req.query;
    const companyId = req.user.companyId;

    let whereClause = { companyId, deletedAt: null };

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (dateFilter) {
      const now = new Date();
      let startDate, endDate;
      
      if (dateFilter === 'Today') {
        startDate = new Date(new Date().setHours(0, 0, 0, 0));
        endDate = new Date(new Date().setHours(23, 59, 59, 999));
      } else if (dateFilter === 'Yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.setHours(0, 0, 0, 0));
        endDate = new Date(yesterday.setHours(23, 59, 59, 999));
      } else if (dateFilter === 'Last 7 Days') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(new Date().setHours(23, 59, 59, 999));
      } else if (dateFilter === 'Last 30 Days') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(new Date().setHours(23, 59, 59, 999));
      } else if (dateFilter === 'This Month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (dateFilter === 'Last Month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (dateFilter === 'Custom Range') {
        const { fromDate, toDate } = req.query;
        if (fromDate && toDate) {
          startDate = new Date(fromDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(toDate);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      if (startDate && endDate) {
        whereClause.complainDate = {
          gte: startDate,
          lte: endDate
        };
      }
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

// Create a new complaint
exports.createComplaint = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      complainDate,
      partyName,
      productName,
      technicianName,
      details,
      serviceAmount,
      remark,
      location,
      status
    } = req.body;

    const newComplaint = await prisma.complaint.create({
      data: {
        complainDate: complainDate ? new Date(complainDate) : new Date(),
        partyName,
        productName,
        technicianName,
        details,
        serviceAmount: parseFloat(serviceAmount) || 0,
        remark,
        location,
        status: status || 'Pending',
        companyId
      }
    });

    res.status(201).json(newComplaint);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
};

// Update a complaint
exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const updates = req.body;

    if (updates.complainDate) {
      updates.complainDate = new Date(updates.complainDate);
    }
    if (updates.serviceAmount !== undefined) {
      updates.serviceAmount = parseFloat(updates.serviceAmount) || 0;
    }

    const complaint = await prisma.complaint.updateMany({
      where: { id: parseInt(id), companyId },
      data: updates
    });

    if (complaint.count === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
};

// Soft delete a complaint
exports.deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const complaint = await prisma.complaint.updateMany({
      where: { id: parseInt(id), companyId },
      data: { deletedAt: new Date() }
    });

    if (complaint.count === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
};
