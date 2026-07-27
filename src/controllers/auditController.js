const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/v1/audit-logs - tenant scoped audit log
exports.getLogs = async (req, res) => {
  const companyId = req.user.companyId;
  const role = req.user.role;

  if (!companyId && role !== 'SUPERADMIN') {
    return res.status(400).json({ success: false, message: 'Company ID is required' });
  }

  try {
    const whereClause = companyId ? { companyId } : {};
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
    
    // Map data to match what the frontend expects
    const formattedLogs = logs.map(log => ({
      ...log,
      timestamp: log.createdAt
    }));
    
    res.status(200).json({ success: true, data: formattedLogs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/v1/audit-logs - create a new audit log
exports.createLog = async (req, res) => {
  const companyId = req.user.companyId;
  const userName = req.user.name || 'Unknown User';
  const userRole = req.user.role || 'User';

  const {
    actionType,
    billNumber,
    moduleName,
    previousData,
    updatedData,
    ipAddress,
    details,
    referenceId
  } = req.body;

  if (!actionType) {
    return res.status(400).json({ success: false, message: 'actionType is required' });
  }

  try {
    const newLog = await prisma.auditLog.create({
      data: {
        actionType,
        details: details || null,
        referenceId: referenceId ? String(referenceId) : null,
        userName,
        userRole,
        billNumber: billNumber ? String(billNumber) : null,
        moduleName: moduleName || null,
        previousData: previousData || null,
        updatedData: updatedData || null,
        ipAddress: ipAddress || req.ip || null,
        companyId
      }
    });

    res.status(201).json({ success: true, data: newLog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error while creating audit log' });
  }
};
