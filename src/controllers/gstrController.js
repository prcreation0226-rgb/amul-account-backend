const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getGstr1Summary = async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate } = req.query;

  try {
    const whereClause = {
      companyId,
      type: {
        in: ['SALES', 'SALES_RETURN']
      }
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: start,
        lte: end
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: true
      }
    });

    // Initialize summary object
    const summary = {
      b2b: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      b2cLarge: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      b2cSmall: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      cdnr: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 }, // Credit/Debit Notes Registered
      cdnur: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 }, // Credit/Debit Notes Unregistered
      exports: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      nilRated: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      total: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 }
    };

    invoices.forEach(inv => {
      const isReturn = inv.type === 'SALES_RETURN';
      const hasGstin = inv.customer && inv.customer.gstin && inv.customer.gstin.trim() !== '';
      
      // Calculate item level tax details
      let taxable = inv.subTotal || 0;
      let igst = inv.totalIgst || 0;
      let cgst = inv.totalCgst || 0;
      let sgst = inv.totalSgst || 0;
      let taxAmt = inv.totalGstAmount || (igst + cgst + sgst);
      let invoiceAmt = inv.totalAmount || 0;
      let cess = 0; // Assuming cess is not widely used or 0 for now

      // Multiplier for returns
      const m = isReturn ? -1 : 1;

      // Classify invoice
      let category = '';

      if (isReturn) {
        category = hasGstin ? 'cdnr' : 'cdnur';
      } else {
        if (hasGstin) {
          category = 'b2b';
        } else {
          // B2C Large vs Small
          // Generally B2C large is > 2.5L and inter-state, but we'll use > 250000 as a simple heuristic if no state check is strict
          if (invoiceAmt > 250000) {
            category = 'b2cLarge';
          } else {
            category = 'b2cSmall';
          }
        }
      }
      
      // We don't have explicit export or nil-rated tags in simple schema, so we skip complex classification unless partyType="Export"
      if (inv.customer && (inv.customer.partyType === 'Export' || inv.customer.sezParty === true)) {
          category = 'exports';
      }

      // Add to category
      if (summary[category]) {
        summary[category].count += 1; // absolute count
        summary[category].taxable += (taxable * m);
        summary[category].igst += (igst * m);
        summary[category].cgst += (cgst * m);
        summary[category].sgst += (sgst * m);
        summary[category].cess += (cess * m);
        summary[category].taxAmt += (taxAmt * m);
        summary[category].invoiceAmt += (invoiceAmt * m);
      }

      // Add to total
      summary.total.count += 1;
      summary.total.taxable += (taxable * m);
      summary.total.igst += (igst * m);
      summary.total.cgst += (cgst * m);
      summary.total.sgst += (sgst * m);
      summary.total.cess += (cess * m);
      summary.total.taxAmt += (taxAmt * m);
      summary.total.invoiceAmt += (invoiceAmt * m);
    });

    const companyInfo = await prisma.company.findUnique({
      where: { id: companyId },
      include: { branches: { take: 1 } }
    });
    const companyData = {
      name: companyInfo?.name || '',
      gstin: (companyInfo?.branches && companyInfo.branches.length > 0) ? companyInfo.branches[0].gstin || '' : ''
    };

    res.status(200).json({ success: true, data: summary, company: companyData });
  } catch (error) {
    console.error('Error fetching GSTR-1 summary:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getGstr2Summary = async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate } = req.query;

  try {
    const whereClause = {
      companyId,
      type: {
        in: ['PURCHASE', 'PURCHASE_RETURN']
      }
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: start,
        lte: end
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: true
      }
    });

    // Initialize summary object (same categories as requested for GSTR-2 UI)
    const summary = {
      b2b: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      b2cLarge: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      b2cSmall: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      cdnr: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 }, // Credit/Debit Notes Registered
      cdnur: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 }, // Credit/Debit Notes Unregistered
      exports: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      nilRated: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 },
      total: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, taxAmt: 0, invoiceAmt: 0 }
    };

    invoices.forEach(inv => {
      const isReturn = inv.type === 'PURCHASE_RETURN';
      const hasGstin = inv.customer && inv.customer.gstin && inv.customer.gstin.trim() !== '';
      
      // Calculate item level tax details
      let taxable = inv.subTotal || 0;
      let igst = inv.totalIgst || 0;
      let cgst = inv.totalCgst || 0;
      let sgst = inv.totalSgst || 0;
      let taxAmt = inv.totalGstAmount || (igst + cgst + sgst);
      let invoiceAmt = inv.totalAmount || 0;
      let cess = 0; // Assuming cess is not widely used or 0 for now

      // Multiplier for returns (Purchase return reduces the values)
      const m = isReturn ? -1 : 1;

      // Classify invoice
      let category = '';

      if (isReturn) {
        category = hasGstin ? 'cdnr' : 'cdnur';
      } else {
        if (hasGstin) {
          category = 'b2b';
        } else {
          // Unregistered purchases
          if (invoiceAmt > 250000) {
            category = 'b2cLarge';
          } else {
            category = 'b2cSmall';
          }
        }
      }
      
      if (inv.customer && (inv.customer.partyType === 'Import' || inv.customer.sezParty === true)) {
          category = 'exports'; // Mapping Import/SEZ here for UI
      }

      // Add to category
      if (summary[category]) {
        summary[category].count += 1;
        summary[category].taxable += (taxable * m);
        summary[category].igst += (igst * m);
        summary[category].cgst += (cgst * m);
        summary[category].sgst += (sgst * m);
        summary[category].cess += (cess * m);
        summary[category].taxAmt += (taxAmt * m);
        summary[category].invoiceAmt += (invoiceAmt * m);
      }

      // Add to total
      summary.total.count += 1;
      summary.total.taxable += (taxable * m);
      summary.total.igst += (igst * m);
      summary.total.cgst += (cgst * m);
      summary.total.sgst += (sgst * m);
      summary.total.cess += (cess * m);
      summary.total.taxAmt += (taxAmt * m);
      summary.total.invoiceAmt += (invoiceAmt * m);
    });

    const companyInfo = await prisma.company.findUnique({
      where: { id: companyId },
      include: { branches: { take: 1 } }
    });
    const companyData = {
      name: companyInfo?.name || '',
      gstin: (companyInfo?.branches && companyInfo.branches.length > 0) ? companyInfo.branches[0].gstin || '' : ''
    };

    res.status(200).json({ success: true, data: summary, company: companyData });
  } catch (error) {
    console.error('Error fetching GSTR-2 summary:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getGstr3bSummary = async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate } = req.query;

  try {
    let dateFilter;
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      dateFilter = {
        gte: start,
        lte: end
      };
    }

    // Fetch SALES and SALES_RETURN invoices (Outward supplies)
    const salesInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: { in: ['SALES', 'SALES_RETURN'] },
        ...(dateFilter ? { date: dateFilter } : {})
      },
      include: { customer: true, items: true }
    });

    // Fetch PURCHASE and PURCHASE_RETURN invoices (Inward supplies / ITC)
    const purchaseInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: { in: ['PURCHASE', 'PURCHASE_RETURN'] },
        ...(dateFilter ? { date: dateFilter } : {})
      },
      include: { customer: true, items: true }
    });

    // ── Section 3.1 Outward Supplies ──
    const s31 = {
      a: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }, // Normal taxable
      b: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }, // Zero rated (exports)
      c: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }, // Nil rated / exempted
      d: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }, // Reverse charge inward
      e: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }, // Non-GST outward
      total: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }
    };

    salesInvoices.forEach(inv => {
      const m = inv.type === 'SALES_RETURN' ? -1 : 1;
      const taxable = (inv.subTotal || 0) * m;
      const igst = (inv.totalIgst || 0) * m;
      const cgst = (inv.totalCgst || 0) * m;
      const sgst = (inv.totalSgst || 0) * m;
      const gstAmt = (inv.totalGstAmount || 0) * m;
      const isExport = inv.customer && (inv.customer.partyType === 'Export' || inv.customer.sezParty === true);
      const isNilRated = gstAmt === 0 && taxable > 0;

      let slot;
      if (isExport) {
        slot = 'b';
      } else if (isNilRated) {
        slot = 'c';
      } else {
        slot = 'a';
      }

      s31[slot].taxable += taxable;
      s31[slot].igst += igst;
      s31[slot].cgst += cgst;
      s31[slot].sgst += sgst;

      s31.total.taxable += taxable;
      s31.total.igst += igst;
      s31.total.cgst += cgst;
      s31.total.sgst += sgst;
    });

    // ── Section 4 Eligible ITC from Purchases ──
    const s4 = {
      importOfGoods: { igst: 0, cgst: 0, sgst: 0, cess: 0 }, // (1) Import of Goods
      importOfServices: { igst: 0, cgst: 0, sgst: 0, cess: 0 }, // (2) Import of Services
      inwardReverseCharge: { igst: 0, cgst: 0, sgst: 0, cess: 0 }, // (3) Inward supplies liable to reverse charge
      inwardIsd: { igst: 0, cgst: 0, sgst: 0, cess: 0 }, // (4) Inward supplies from ISD
      allOtherItc: { igst: 0, cgst: 0, sgst: 0, cess: 0 }, // (5) All other ITC from normal purchases
      itcReversed: { igst: 0, cgst: 0, sgst: 0, cess: 0 }, // (B) Purchase Returns
      netItc: { igst: 0, cgst: 0, sgst: 0, cess: 0 }       // (C) Net
    };

    purchaseInvoices.forEach(inv => {
      const igst = inv.totalIgst || 0;
      const cgst = inv.totalCgst || 0;
      const sgst = inv.totalSgst || 0;

      if (inv.type === 'PURCHASE') {
        s4.allOtherItc.igst += igst;
        s4.allOtherItc.cgst += cgst;
        s4.allOtherItc.sgst += sgst;
      } else if (inv.type === 'PURCHASE_RETURN') {
        s4.itcReversed.igst += igst;
        s4.itcReversed.cgst += cgst;
        s4.itcReversed.sgst += sgst;
      }
    });

    s4.netItc.igst = s4.allOtherItc.igst - s4.itcReversed.igst;
    s4.netItc.cgst = s4.allOtherItc.cgst - s4.itcReversed.cgst;
    s4.netItc.sgst = s4.allOtherItc.sgst - s4.itcReversed.sgst;

    // ── Section 5 Values of exempt, nil-rated and non-GST inward supplies ──
    const s5 = {
      compositionExemptNil: { inter: 0, intra: 0 },
      nonGst: { inter: 0, intra: 0 }
    };

    // ── Section 6.1 Payment of Tax ──
    // Tax payable = Outward tax (Section 3.1 total)
    // Net cash payable = Tax payable - Net ITC
    const s61 = {
      igst: {
        taxPayable: s31.total.igst,
        itcIgst: s4.netItc.igst,
        itcCgst: 0, itcSgst: 0, itcCess: 0,
        tdsTcs: 0,
        cashPaid: Math.max(0, s31.total.igst - s4.netItc.igst),
        interest: 0, lateFee: 0
      },
      cgst: {
        taxPayable: s31.total.cgst,
        itcIgst: 0, itcCgst: s4.netItc.cgst, itcSgst: 0, itcCess: 0,
        tdsTcs: 0,
        cashPaid: Math.max(0, s31.total.cgst - s4.netItc.cgst),
        interest: 0, lateFee: 0
      },
      sgst: {
        taxPayable: s31.total.sgst,
        itcIgst: 0, itcCgst: 0, itcSgst: s4.netItc.sgst, itcCess: 0,
        tdsTcs: 0,
        cashPaid: Math.max(0, s31.total.sgst - s4.netItc.sgst),
        interest: 0, lateFee: 0
      },
      cess: {
        taxPayable: 0, itcIgst: 0, itcCgst: 0, itcSgst: 0, itcCess: 0,
        tdsTcs: 0, cashPaid: 0, interest: 0, lateFee: 0
      }
    };

    // ── Section 6.1 TDS/TCS Credit ──
    const tdsTcs = {
      tds: { igst: 0, cgst: 0, sgst: 0 },
      tcs: { igst: 0, cgst: 0, sgst: 0 }
    };

    res.status(200).json({
      success: true,
      data: { s31, s4, s5, s61, tdsTcs }
    });
  } catch (error) {
    console.error('Error fetching GSTR-3B summary:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSaleSummaryReport = async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate, partyName, showHsnWise } = req.query;

  try {
    const whereClause = {
      companyId,
      type: {
        in: ['SALES', 'SALES_RETURN']
      }
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: start,
        lte: end
      };
    }

    if (partyName && partyName !== '') {
      whereClause.customer = {
        name: partyName
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    let reportData = [];

    invoices.forEach(inv => {
      const m = inv.type === 'SALES_RETURN' ? -1 : 1;
      
      inv.items.forEach(item => {
        reportData.push({
          date: inv.date,
          invoiceNo: inv.invoiceNo,
          partyName: inv.customer ? inv.customer.name : 'Cash',
          gstin: inv.customer ? inv.customer.gstin : '',
          state: inv.customer ? inv.customer.state : '',
          taxableAmount: (item.amount || 0) * m,
          gstPercent: item.gstRate || 0,
          quantity: (item.quantity || 0) * m,
          igst: (item.igst || 0) * m,
          cgst: (item.cgst || 0) * m,
          sgst: (item.sgst || 0) * m,
          subTotal: (item.amount || 0) * m,
          grandTotal: ((item.amount || 0) + (item.gstAmount || 0)) * m,
          hsn: item.product ? item.product.hsnCode : ''
        });
      });
    });

    res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error('Error fetching sale summary:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
