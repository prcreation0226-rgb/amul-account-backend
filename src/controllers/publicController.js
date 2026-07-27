const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Public: Get invoice by invoiceNo (no auth required)
exports.getPublicBill = async (req, res) => {
  const { invoiceNo } = req.params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNo: invoiceNo },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            mobile: true,
            address: true,
            gstin: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                barcode: true,
                tax: true,
              }
            }
          }
        },
        company: {
          select: {
            name: true,
            address: true,
            phone: true,
            ownerEmail: true,
            logo: true,
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const invoiceData = {
      ...invoice,
      company: invoice.company ? {
        ...invoice.company,
        email: invoice.company.ownerEmail
      } : null
    };

    res.status(200).json({ success: true, data: invoiceData });
  } catch (error) {
    console.error('getPublicBill error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
