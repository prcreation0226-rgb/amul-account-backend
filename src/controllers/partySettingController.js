const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get settings for the current company
exports.getSettings = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const settings = await prisma.partySetting.findUnique({
      where: { companyId }
    });
    
    // If no settings exist yet, return defaults
    if (!settings) {
      return res.status(200).json({ 
        success: true, 
        data: {
          defaultDueDays: 7,
          showPartyTags: true,
          showDueDate: true,
          extraColumns: []
        } 
      });
    }

    // Safely parse extraColumns in case DB driver returns it as a string
    const data = {
      ...settings,
      extraColumns: Array.isArray(settings.extraColumns)
        ? settings.extraColumns
        : (typeof settings.extraColumns === 'string'
            ? JSON.parse(settings.extraColumns)
            : [])
    };
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create or update settings for the current company
exports.upsertSettings = async (req, res) => {
  const companyId = req.user.companyId;
  const { defaultDueDays, showPartyTags, showDueDate, extraColumns } = req.body;

  try {
    const settings = await prisma.partySetting.upsert({
      where: { companyId },
      update: {
        defaultDueDays: defaultDueDays ? parseInt(defaultDueDays, 10) : 7,
        showPartyTags: showPartyTags !== undefined ? showPartyTags : true,
        showDueDate: showDueDate !== undefined ? showDueDate : true,
        extraColumns: extraColumns || []
      },
      create: {
        companyId,
        defaultDueDays: defaultDueDays ? parseInt(defaultDueDays, 10) : 7,
        showPartyTags: showPartyTags !== undefined ? showPartyTags : true,
        showDueDate: showDueDate !== undefined ? showDueDate : true,
        extraColumns: extraColumns || []
      }
    });

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
