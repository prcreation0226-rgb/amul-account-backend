const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getCurrencies = async (req, res) => {
  try {
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    });
    res.status(200).json({ success: true, data: currencies });
  } catch (error) {
    console.error("Error fetching currencies:", error);
    res.status(500).json({ success: false, error: "Failed to fetch currencies" });
  }
};
