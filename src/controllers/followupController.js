const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getFollowups = async (req, res) => {
  const { customerId } = req.params;
  try {
    const followups = await prisma.followup.findMany({
      where: { customerId: parseInt(customerId, 10) },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: followups });
  } catch (error) {
    console.error('Failed to get followups:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addFollowup = async (req, res) => {
  const { customerId } = req.params;
  const { reason, reminderDate } = req.body;
  try {
    if (!reason || !reminderDate) {
      return res.status(400).json({ success: false, message: 'Reason and Date are required' });
    }

    const followup = await prisma.followup.create({
      data: {
        reason,
        reminderDate,
        customerId: parseInt(customerId, 10)
      }
    });
    res.status(201).json({ success: true, data: followup });
  } catch (error) {
    console.error('Failed to add followup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteFollowup = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.followup.delete({
      where: { id: parseInt(id, 10) }
    });
    res.status(200).json({ success: true, message: 'Followup deleted successfully' });
  } catch (error) {
    console.error('Failed to delete followup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
