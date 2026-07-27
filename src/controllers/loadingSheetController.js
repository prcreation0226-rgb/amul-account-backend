const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');

exports.createLoadingSheet = async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    const companyId = req.user.companyId;

    if (!invoiceIds || invoiceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No invoices selected' });
    }

    // Create the loading sheet
    const sheetNo = `LS-${Date.now()}`;
    const loadingSheet = await prisma.loadingSheet.create({
      data: {
        sheetNo,
        companyId,
        items: {
          create: invoiceIds.map(id => ({ invoiceId: id }))
        }
      },
      include: {
        items: {
          include: {
            invoice: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({ success: true, data: loadingSheet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create loading sheet' });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    const companyId = req.user.companyId;

    if (!invoiceIds || invoiceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No invoices selected' });
    }

    // Fetch full invoice details
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds }, companyId },
      include: { customer: true }
    });

    // Generate PDF using pdfkit
    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-disposition', `attachment; filename=LoadingSheet_${Date.now()}.pdf`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Loading Sheet', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12);
    let totalAmount = 0;
    
    invoices.forEach((inv, index) => {
      doc.text(`${index + 1}. Invoice No: ${inv.invoiceNo}`);
      doc.text(`   Party: ${inv.customer?.name || 'Cash'}`);
      doc.text(`   Date: ${new Date(inv.date).toLocaleDateString()}`);
      doc.text(`   Amount: Rs. ${inv.totalAmount.toFixed(2)}`);
      doc.moveDown();
      totalAmount += inv.totalAmount;
    });

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text(`Total Invoices: ${invoices.length}`);
    doc.text(`Total Amount: Rs. ${totalAmount.toFixed(2)}`);

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};
