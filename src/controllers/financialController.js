const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getCollectionReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;

    // Define date filters
    let dateFilter = {};
    let transactionDateFilter = {};
    if (startDate && endDate) {
      // Ensure the dates encompass the full day
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      dateFilter = {
        createdAt: {
          gte: start,
          lte: end
        }
      };
      
      transactionDateFilter = {
        date: {
          gte: start,
          lte: end
        }
      };
    }

    // Fetch all sales and purchases within the date range
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : undefined
        }
      }
    });

    const paymentTransactions = await prisma.paymentBookTransaction.findMany({
      where: { companyId, ...transactionDateFilter }
    });

    const incomeTransactions = await prisma.incomeTransaction.findMany({
      where: { companyId, ...transactionDateFilter }
    });

    const expenseTransactions = await prisma.expenseTransaction.findMany({
      where: { companyId, ...transactionDateFilter }
    });

    const employeeTransactions = await prisma.employeeTransaction.findMany({
      where: { companyId, ...transactionDateFilter }
    });

    // Aggregations
    let todaySales = 0;
    let cashSales = 0;
    let creditSales = 0;
    let purchases = 0;

    invoices.forEach(inv => {
      if (inv.type === 'SALES') {
        todaySales += inv.totalAmount;
        if (inv.paymentMode.toLowerCase() === 'cash') {
          cashSales += inv.totalAmount;
        } else {
          creditSales += inv.totalAmount;
        }
      } else if (inv.type === 'PURCHASE') {
        purchases += inv.totalAmount;
      }
    });

    let creditRecovery = paymentTransactions.reduce((sum, txn) => sum + (txn.paymentIn || 0), 0);
    
    let otherIncome = incomeTransactions.reduce((sum, txn) => sum + (txn.paidAmount || 0), 0);

    // Money In = Cash Sales + Credit Recovery + Other Income
    const moneyIn = {
      cashSale: cashSales,
      creditRecovery: creditRecovery,
      otherIncome: otherIncome,
      total: cashSales + creditRecovery + otherIncome
    };

    // Money Out = Purchases (Company Paid) + Expenses + Employee
    let companyPaid = purchases;
    let employeePaid = employeeTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0);
    let expensesPaid = expenseTransactions.reduce((sum, txn) => sum + (txn.paidAmount || 0), 0);

    const moneyOut = {
      companyPaid: companyPaid,
      employeePaid: employeePaid,
      expensesPaid: expensesPaid,
      total: companyPaid + employeePaid + expensesPaid
    };

    const netCollection = moneyIn.total - moneyOut.total;

    // Calculate generic cash/bank balances from Bank model
    const banks = await prisma.bank.findMany({ where: { companyId } });
    let cashBalance = 0;
    let bankBalance = 0;
    banks.forEach(b => {
      if (b.type.toLowerCase() === 'cash') cashBalance += b.balance;
      else bankBalance += b.balance;
    });

    res.status(200).json({
      success: true,
      data: {
        todaySales,
        cashSales,
        creditSales,
        moneyIn,
        moneyOut,
        netCollection,
        accounts: {
          cash: cashBalance,
          bank: bankBalance
        }
      }
    });

  } catch (error) {
    console.error("Error generating collection report:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getDayBookSummary = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { dateType, fromDate, toDate, withItems, voucherType } = req.query;

    let dateFilter = {};
    if (fromDate || toDate) {
      const field = dateType === 'Modified Date' ? 'updatedAt' : 'date';
      dateFilter[field] = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        dateFilter[field].gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        dateFilter[field].lte = end;
      }
    }

    const transactions = [];

    // Fetch Invoices
    if (!voucherType || ['SALES', 'PURCHASE', 'PURCHASE_RETURN', 'SALES_RETURN'].includes(voucherType)) {
      const invoices = await prisma.invoice.findMany({
        where: {
          companyId,
          ...dateFilter,
          ...(voucherType && { type: voucherType })
        },
        include: {
          customer: true,
          ...(withItems === 'true' && { items: { include: { product: true } } })
        }
      });

      invoices.forEach(inv => {
        let debit = 0;
        let paymentIn = 0;
        let paymentOut = 0;
        let discount = inv.totalDiscount || 0;

        if (inv.type === 'SALES' || inv.type === 'PURCHASE_RETURN') {
          if (inv.paymentMode && inv.paymentMode.toLowerCase() === 'cash') {
            paymentIn = inv.totalAmount;
          } else {
            debit = inv.totalAmount;
          }
        } else if (inv.type === 'PURCHASE' || inv.type === 'SALES_RETURN') {
          paymentOut = inv.totalAmount;
        }

        transactions.push({
          id: `inv_${inv.id}`,
          date: inv.date,
          voucherNo: inv.invoiceNo,
          particular: inv.customer ? inv.customer.name : 'Cash',
          voucherType: inv.type,
          debit,
          paymentIn,
          paymentOut,
          discount,
          items: inv.items
        });
      });
    }

    // Fetch Payment Book Transactions
    if (!voucherType || voucherType === 'PAYMENT' || voucherType === 'RECEIPT') {
      const paymentFilterDate = dateType === 'Modified Date' ? { updatedAt: dateFilter.updatedAt } : { date: dateFilter.date };
      
      const payments = await prisma.paymentBookTransaction.findMany({
        where: {
          companyId,
          ...paymentFilterDate
        },
        include: {
          paymentBook: true
        }
      });

      payments.forEach(pay => {
        let paymentType = pay.paymentIn > 0 ? 'RECEIPT' : 'PAYMENT';
        if (voucherType && voucherType !== paymentType) return;

        transactions.push({
          id: `pay_${pay.id}`,
          date: pay.date,
          voucherNo: '-',
          particular: pay.paymentBook ? pay.paymentBook.partyName : '-',
          voucherType: paymentType,
          debit: 0,
          paymentIn: pay.paymentIn || 0,
          paymentOut: pay.paymentOut || 0,
          discount: pay.discount || 0
        });
      });
    }

    // Fetch Expense Transactions
    if (!voucherType || voucherType === 'EXPENSE') {
      const expenseFilterDate = dateType === 'Modified Date' ? { updatedAt: dateFilter.updatedAt } : { date: dateFilter.date };
      
      const expenses = await prisma.expenseTransaction.findMany({
        where: {
          companyId,
          ...expenseFilterDate
        },
        include: {
          expense: true
        }
      });

      expenses.forEach(exp => {
        transactions.push({
          id: `exp_${exp.id}`,
          date: exp.date,
          voucherNo: '-',
          particular: exp.expense ? exp.expense.name : '-',
          voucherType: 'EXPENSE',
          debit: 0,
          paymentIn: 0,
          paymentOut: exp.paidAmount || 0,
          discount: exp.discount || 0
        });
      });
    }

    // Sort transactions by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error("Error generating day book summary:", error);
    res.status(500).json({ success: false, error: "Failed to fetch day book summary" });
  }
};

exports.getBrandwiseSale = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, customerId } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'SALES',
        ...dateFilter,
        ...(customerId && customerId !== 'all' && { customerId: parseInt(customerId, 10) })
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const brandMap = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const brandName = (item.product && item.product.brand) ? item.product.brand : 'Unbranded';
        
        if (!brandMap[brandName]) {
          brandMap[brandName] = {
            brandName,
            totalQuantity: 0,
            totalAmount: 0,
            totalDiscount: 0
          };
        }

        brandMap[brandName].totalQuantity += item.quantity || 0;
        brandMap[brandName].totalAmount += item.amount || 0;
        
        // Summing up discount1 and discount2 if they are flat amounts. 
        // If they are percentages, this would need adjusting based on how it's stored.
        // Assuming discount1 is a flat amount for now, or just fallback to 0.
        const d1 = parseFloat(item.discount1) || 0;
        const d2 = parseFloat(item.discount2) || 0;
        brandMap[brandName].totalDiscount += (d1 + d2);
      });
    });

    const reportData = Object.values(brandMap).sort((a, b) => a.brandName.localeCompare(b.brandName));

    res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error("Error generating brandwise sale summary:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getBrandwisePurchase = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, supplierId } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'PURCHASE',
        ...dateFilter,
        ...(supplierId && supplierId !== 'all' && { customerId: parseInt(supplierId, 10) }) // Note: customerId field is used for both party types in Invoice model based on current design
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const brandMap = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const brandName = (item.product && item.product.brand) ? item.product.brand : 'Unbranded';
        
        if (!brandMap[brandName]) {
          brandMap[brandName] = {
            brandName,
            totalQuantity: 0,
            totalAmount: 0,
            totalDiscount: 0
          };
        }

        brandMap[brandName].totalQuantity += item.quantity || 0;
        brandMap[brandName].totalAmount += item.amount || 0;
        
        const d1 = parseFloat(item.discount1) || 0;
        const d2 = parseFloat(item.discount2) || 0;
        brandMap[brandName].totalDiscount += (d1 + d2);
      });
    });

    const reportData = Object.values(brandMap).sort((a, b) => a.brandName.localeCompare(b.brandName));

    res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error("Error generating brandwise purchase summary:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getCategorywiseSale = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, customerId } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'SALES',
        ...dateFilter,
        ...(customerId && customerId !== 'all' && { customerId: parseInt(customerId, 10) })
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const categoryMap = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const categoryName = (item.product && item.product.category) ? item.product.category : 'Uncategorized';
        
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = {
            categoryName,
            totalQuantity: 0,
            totalAmount: 0,
            totalDiscount: 0
          };
        }

        categoryMap[categoryName].totalQuantity += item.quantity || 0;
        categoryMap[categoryName].totalAmount += item.amount || 0;
        
        const d1 = parseFloat(item.discount1) || 0;
        const d2 = parseFloat(item.discount2) || 0;
        categoryMap[categoryName].totalDiscount += (d1 + d2);
      });
    });

    const reportData = Object.values(categoryMap).sort((a, b) => a.categoryName.localeCompare(b.categoryName));

    res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error("Error generating categorywise sale summary:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getCategorywisePurchase = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, supplierId } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'PURCHASE',
        ...dateFilter,
        ...(supplierId && supplierId !== 'all' && { customerId: parseInt(supplierId, 10) })
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const categoryMap = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const categoryName = (item.product && item.product.category) ? item.product.category : 'Uncategorized';
        
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = {
            categoryName,
            totalQuantity: 0,
            totalAmount: 0,
            totalDiscount: 0
          };
        }

        categoryMap[categoryName].totalQuantity += item.quantity || 0;
        categoryMap[categoryName].totalAmount += item.amount || 0;
        
        const d1 = parseFloat(item.discount1) || 0;
        const d2 = parseFloat(item.discount2) || 0;
        categoryMap[categoryName].totalDiscount += (d1 + d2);
      });
    });

    const reportData = Object.values(categoryMap).sort((a, b) => a.categoryName.localeCompare(b.categoryName));

    res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error("Error generating categorywise purchase summary:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getItemwiseSale = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, customerId, search } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { gte: start, lte: end } };
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'SALES',
        ...dateFilter,
        ...(customerId && customerId !== 'all' && { customerId: parseInt(customerId, 10) })
      },
      include: {
        items: { include: { product: true } }
      }
    });

    const itemMap = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const itemName = item.product ? item.product.name : (item.productName || 'Unknown Item');
        const itemKey = item.productId || itemName;

        if (!itemMap[itemKey]) {
          itemMap[itemKey] = {
            itemName,
            totalQuantity: 0,
            totalAmount: 0,
            totalDiscount: 0
          };
        }

        itemMap[itemKey].totalQuantity += item.quantity || 0;
        itemMap[itemKey].totalAmount += item.amount || 0;
        const d1 = parseFloat(item.discount1) || 0;
        const d2 = parseFloat(item.discount2) || 0;
        itemMap[itemKey].totalDiscount += (d1 + d2);
      });
    });

    let reportData = Object.values(itemMap).sort((a, b) => a.itemName.localeCompare(b.itemName));

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      reportData = reportData.filter(r => r.itemName.toLowerCase().includes(searchLower));
    }

    res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error("Error generating itemwise sale summary:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getItemwisePurchase = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, supplierId, search } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { gte: start, lte: end } };
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'PURCHASE',
        ...dateFilter,
        ...(supplierId && supplierId !== 'all' && { customerId: parseInt(supplierId, 10) })
      },
      include: {
        items: { include: { product: true } }
      }
    });

    const itemMap = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const itemName = item.product ? item.product.name : (item.productName || 'Unknown Item');
        const itemKey = item.productId || itemName;

        if (!itemMap[itemKey]) {
          itemMap[itemKey] = {
            itemName,
            totalQuantity: 0,
            totalAmount: 0,
            totalDiscount: 0
          };
        }

        itemMap[itemKey].totalQuantity += item.quantity || 0;
        itemMap[itemKey].totalAmount += item.amount || 0;
        const d1 = parseFloat(item.discount1) || 0;
        const d2 = parseFloat(item.discount2) || 0;
        itemMap[itemKey].totalDiscount += (d1 + d2);
      });
    });

    let reportData = Object.values(itemMap).sort((a, b) => a.itemName.localeCompare(b.itemName));

    if (search) {
      const searchLower = search.toLowerCase();
      reportData = reportData.filter(r => r.itemName.toLowerCase().includes(searchLower));
    }

    res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error("Error generating itemwise purchase summary:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getEmployeewiseSale = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { gte: start, lte: end } };
    }

    // Fetch invoices with salesperson info if available
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'SALES',
        ...dateFilter
      },
      include: {
        items: true
      }
    });

    const employeeMap = {};

    invoices.forEach(inv => {
      // Use salesperson if present, otherwise group under 'Unassigned'
      const empName = inv.salesperson || inv.employeeName || 'Unassigned';

      if (!employeeMap[empName]) {
        employeeMap[empName] = {
          employeeName: empName,
          totalQuantity: 0,
          totalSale: 0,
          totalCollection: 0
        };
      }

      const qty = inv.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      employeeMap[empName].totalQuantity += qty;
      employeeMap[empName].totalSale += inv.totalAmount || 0;

      // Cash sales = collection, credit = not yet collected
      if (inv.paymentMode && inv.paymentMode.toLowerCase() === 'cash') {
        employeeMap[empName].totalCollection += inv.totalAmount || 0;
      }
    });

    const reportData = Object.values(employeeMap).sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error("Error generating employeewise sale summary:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getInvoicesReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { type, fromDate, toDate, customerId } = req.query;

    // Map frontend type to DB invoice type
    const typeMap = {
      'Sales': 'SALES',
      'Purchase': 'PURCHASE',
      'Sales Return': 'SALES_RETURN',
      'Purchase Return': 'PURCHASE_RETURN',
      'Quotation': 'QUOTATION'
    };

    const dbType = type ? typeMap[type] : 'SALES';

    let dateFilter = {};
    if (fromDate || toDate) {
      dateFilter.date = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.date.gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        ...(dbType && { type: dbType }),
        ...dateFilter,
        ...(customerId && customerId !== 'all' && { customerId: parseInt(customerId, 10) })
      },
      include: {
        customer: true,
        items: { include: { product: true } }
      },
      orderBy: { date: 'desc' }
    });

    // Flatten invoice items for report display
    const rows = [];
    invoices.forEach(inv => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item, idx) => {
          rows.push({
            id: `${inv.id}_${idx}`,
            date: inv.date,
            invoiceNo: inv.invoiceNo,
            party: inv.customer ? inv.customer.name : 'Cash',
            productName: item.product ? item.product.name : (item.productName || '-'),
            quantity: item.quantity || 0,
            price: item.price || 0,
            amount: item.amount || 0,
            gstTax: item.gstAmount || 0
          });
        });
      } else {
        rows.push({
          id: inv.id,
          date: inv.date,
          invoiceNo: inv.invoiceNo,
          party: inv.customer ? inv.customer.name : 'Cash',
          productName: '-',
          quantity: 0,
          price: 0,
          amount: inv.totalAmount || 0,
          gstTax: inv.gstAmount || 0
        });
      }
    });

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error generating invoices report:", error);
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
};

exports.getTradingAccount = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { fromDate, toDate } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(0);
    if (fromDate) start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    if (toDate) end.setHours(23, 59, 59, 999);

    // 1. Get Sales and Purchases in the period
    const periodInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end },
        type: { in: ['SALES', 'SALES_RETURN', 'PURCHASE', 'PURCHASE_RETURN'] }
      }
    });

    let sales = 0;
    let salesReturn = 0;
    let purchase = 0;
    let purchaseReturn = 0;

    periodInvoices.forEach(inv => {
      const val = inv.subTotal || 0;
      if (inv.type === 'SALES') sales += val;
      if (inv.type === 'SALES_RETURN') salesReturn += val;
      if (inv.type === 'PURCHASE') purchase += val;
      if (inv.type === 'PURCHASE_RETURN') purchaseReturn += val;
    });

    // 2. Get Products to calculate stock values
    const products = await prisma.product.findMany({
      where: { companyId }
    });

    // 3. Get transactions to roll back
    const futureInvoices = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          date: { gt: end },
          type: { in: ['SALES', 'SALES_RETURN', 'PURCHASE', 'PURCHASE_RETURN'] }
        }
      },
      include: { invoice: true }
    });

    const periodInvoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          date: { gte: start, lte: end },
          type: { in: ['SALES', 'SALES_RETURN', 'PURCHASE', 'PURCHASE_RETURN'] }
        }
      },
      include: { invoice: true }
    });

    let closingStockValue = 0;
    let openingStockValue = 0;

    products.forEach(p => {
      let currentQty = p.stock || 0;
      const price = p.purchasePrice || 0;

      // Rollback future transactions to get Closing Qty (at 'end' date)
      let closingQty = currentQty;
      futureInvoices.filter(fi => fi.productId === p.id).forEach(fi => {
        if (fi.invoice.type === 'SALES') closingQty += fi.quantity;
        if (fi.invoice.type === 'SALES_RETURN') closingQty -= fi.quantity;
        if (fi.invoice.type === 'PURCHASE') closingQty -= fi.quantity;
        if (fi.invoice.type === 'PURCHASE_RETURN') closingQty += fi.quantity;
      });

      closingStockValue += (closingQty * price);

      // Rollback period transactions to get Opening Qty (at 'start' date)
      let openingQty = closingQty;
      periodInvoiceItems.filter(pi => pi.productId === p.id).forEach(pi => {
        if (pi.invoice.type === 'SALES') openingQty += pi.quantity;
        if (pi.invoice.type === 'SALES_RETURN') openingQty -= pi.quantity;
        if (pi.invoice.type === 'PURCHASE') openingQty -= pi.quantity;
        if (pi.invoice.type === 'PURCHASE_RETURN') openingQty += pi.quantity;
      });

      openingStockValue += (openingQty * price);
    });

    res.status(200).json({
      success: true,
      data: {
        sales,
        salesReturn,
        purchase,
        purchaseReturn,
        openingStock: openingStockValue,
        closingStock: closingStockValue
      }
    });
  } catch (error) {
    console.error("Error fetching trading account data:", error);
    res.status(500).json({ success: false, error: "Failed to fetch trading account data" });
  }
};

exports.getProfitLoss = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { fromDate, toDate } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(0);
    if (fromDate) start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    if (toDate) end.setHours(23, 59, 59, 999);

    const periodInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end },
        type: { in: ['SALES', 'SALES_RETURN', 'PURCHASE', 'PURCHASE_RETURN'] }
      }
    });

    let sales = 0;
    let salesReturn = 0;
    let purchase = 0;
    let purchaseReturn = 0;

    periodInvoices.forEach(inv => {
      const val = inv.subTotal || 0;
      if (inv.type === 'SALES') sales += val;
      if (inv.type === 'SALES_RETURN') salesReturn += val;
      if (inv.type === 'PURCHASE') purchase += val;
      if (inv.type === 'PURCHASE_RETURN') purchaseReturn += val;
    });

    const products = await prisma.product.findMany({
      where: { companyId }
    });

    const futureInvoices = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          date: { gt: end },
          type: { in: ['SALES', 'SALES_RETURN', 'PURCHASE', 'PURCHASE_RETURN'] }
        }
      },
      include: { invoice: true }
    });

    const periodInvoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          date: { gte: start, lte: end },
          type: { in: ['SALES', 'SALES_RETURN', 'PURCHASE', 'PURCHASE_RETURN'] }
        }
      },
      include: { invoice: true }
    });

    let closingStock = 0;
    let openingStock = 0;

    products.forEach(p => {
      let currentQty = p.stock || 0;
      const price = p.purchasePrice || 0;

      let closingQty = currentQty;
      futureInvoices.filter(fi => fi.productId === p.id).forEach(fi => {
        if (fi.invoice.type === 'SALES') closingQty += fi.quantity;
        if (fi.invoice.type === 'SALES_RETURN') closingQty -= fi.quantity;
        if (fi.invoice.type === 'PURCHASE') closingQty -= fi.quantity;
        if (fi.invoice.type === 'PURCHASE_RETURN') closingQty += fi.quantity;
      });

      closingStock += (closingQty * price);

      let openingQty = closingQty;
      periodInvoiceItems.filter(pi => pi.productId === p.id).forEach(pi => {
        if (pi.invoice.type === 'SALES') openingQty += pi.quantity;
        if (pi.invoice.type === 'SALES_RETURN') openingQty -= pi.quantity;
        if (pi.invoice.type === 'PURCHASE') openingQty -= pi.quantity;
        if (pi.invoice.type === 'PURCHASE_RETURN') openingQty += pi.quantity;
      });

      openingStock += (openingQty * price);
    });

    const expenses = await prisma.expenseTransaction.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end }
      }
    });

    let operatingExpenses = 0;
    expenses.forEach(exp => {
      operatingExpenses += (exp.expenseAmount || 0);
    });

    res.status(200).json({
      success: true,
      data: {
        sales,
        salesReturn,
        purchase,
        purchaseReturn,
        openingStock,
        closingStock,
        operatingExpenses,
        operatingIncome: 0,
        otherIncomes: 0,
        otherExpenses: 0
      }
    });
  } catch (error) {
    console.error("Error fetching profit and loss data:", error);
    res.status(500).json({ success: false, error: "Failed to fetch profit and loss data" });
  }
};

exports.getBalanceSheet = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { date } = req.query;

    const endDate = date ? new Date(date) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // 1. Get Customers & Companies (Suppliers)
    const parties = await prisma.customer.findMany({
      where: { companyId }
    });

    let customerDue = 0;
    let companyDue = 0;

    parties.forEach(p => {
      if (p.type === 'CUSTOMER') {
        customerDue += (p.balance || 0);
      } else if (p.type === 'COMPANY') {
        companyDue += (p.balance || 0);
      }
    });

    // 2. Get Banks for Cash, Bank, Wallet, Loan balances
    const banks = await prisma.bank.findMany({
      where: { companyId }
    });

    let cashBalance = 0;
    let bankBalance = 0;
    let walletBalance = 0;
    let loanBalance = 0;
    let loanTaken = 0;

    banks.forEach(b => {
      const type = (b.type || '').toLowerCase();
      const name = (b.name || '').toLowerCase();
      const bal = b.balance || 0;

      if (type === 'cash' || name.includes('cash')) {
        cashBalance += bal;
      } else if (type === 'wallet') {
        walletBalance += bal;
      } else if (type === 'loan' || type === 'credit') {
        if (bal < 0) {
          loanTaken += Math.abs(bal);
        } else {
          loanBalance += bal;
        }
      } else {
        bankBalance += bal;
      }
    });

    // 3. Stock Valuation as of endDate
    const products = await prisma.product.findMany({
      where: { companyId }
    });

    const futureInvoices = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          date: { gt: endDate },
          type: { in: ['SALES', 'SALES_RETURN', 'PURCHASE', 'PURCHASE_RETURN'] }
        }
      },
      include: { invoice: true }
    });

    let stockValue = 0;

    products.forEach(p => {
      let currentQty = p.stock || 0;
      const price = p.purchasePrice || 0;

      let closingQty = currentQty;
      futureInvoices.filter(fi => fi.productId === p.id).forEach(fi => {
        if (fi.invoice.type === 'SALES') closingQty += fi.quantity;
        if (fi.invoice.type === 'SALES_RETURN') closingQty -= fi.quantity;
        if (fi.invoice.type === 'PURCHASE') closingQty -= fi.quantity;
        if (fi.invoice.type === 'PURCHASE_RETURN') closingQty += fi.quantity;
      });

      stockValue += (closingQty * price);
    });

    // 4. Employees (Salary Due & Advance)
    const employees = await prisma.employee.findMany({
      where: { companyId }
    });
    
    let employeeSalaryDue = 0;
    let employeeAdvance = 0;

    employees.forEach(emp => {
      const bal = emp.balance || 0;
      if (bal > 0) {
        employeeSalaryDue += bal;
      } else if (bal < 0) {
        employeeAdvance += Math.abs(bal);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        companyDue,
        loanTaken,
        expensesDue: 0,
        employeeSalaryDue,
        customerDue,
        loanGiven: 0,
        expensesAdvance: 0,
        employeeAdvance,
        stock: stockValue,
        cashBalance,
        bankBalance,
        walletBalance,
        loanBalance
      }
    });

  } catch (error) {
    console.error("Error fetching balance sheet data:", error);
    res.status(500).json({ success: false, error: "Failed to fetch balance sheet data" });
  }
};

exports.getTcsReport = async (req, res) => {
  const companyId = req.user.companyId;
  const { customerId, fromDate, toDate } = req.query;

  try {
    const whereClause = { companyId };
    if (customerId) {
      whereClause.customerId = parseInt(customerId, 10);
    }
    
    if (fromDate || toDate) {
      whereClause.date = {};
      if (fromDate) whereClause.date.gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        whereClause.date.lte = to;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { name: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    const reportData = invoices.map(inv => {
      const isSales = inv.type === 'SALES' || inv.type === 'SALES_RETURN' || inv.type === 'CHALLAN';
      const isPurchase = inv.type === 'PURCHASE' || inv.type === 'PURCHASE_RETURN';
      
      const tcsAmount = inv.tcsAmount || 0;
      
      return {
        id: inv.id,
        date: inv.date,
        invoiceNo: inv.invoiceNo,
        partyName: inv.customer ? inv.customer.name : 'Unknown',
        voucherType: inv.type,
        invoiceValue: inv.totalAmount,
        tcsCollected: isSales ? tcsAmount : 0,
        tcsPaid: isPurchase ? tcsAmount : 0
      };
    });

    res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error("Error fetching TCS report data:", error);
    res.status(500).json({ success: false, error: "Failed to fetch TCS report data" });
  }
};

exports.getRojmel = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { date } = req.query; // Expecting YYYY-MM-DD
    
    if (!date) {
      return res.status(400).json({ success: false, error: "Date is required" });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Calculate Opening Balance (all cash IN - all cash OUT before this date)
    // 1. Previous Invoices
    const prevInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        paymentMode: 'Cash',
        date: { lt: startOfDay }
      },
      select: { type: true, totalAmount: true }
    });
    
    // 2. Previous CashBook Manual Entries
    const prevCashBook = await prisma.cashBook.findMany({
      where: {
        companyId,
        date: { lt: startOfDay }
      },
      select: { cashIn: true, cashOut: true }
    });

    let openingBalance = 0;
    prevInvoices.forEach(inv => {
      if (inv.type === 'SALES' || inv.type === 'PURCHASE_RETURN') openingBalance += inv.totalAmount;
      if (inv.type === 'PURCHASE' || inv.type === 'SALES_RETURN') openingBalance -= inv.totalAmount;
    });
    prevCashBook.forEach(cb => {
      openingBalance += (cb.cashIn || 0);
      openingBalance -= (cb.cashOut || 0);
    });

    // Fetch Today's Invoices
    const todaysInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        paymentMode: 'Cash',
        date: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        customer: true
      }
    });

    // Fetch Today's CashBook Entries
    const todaysCashBook = await prisma.cashBook.findMany({
      where: {
        companyId,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    // Format all entries into a unified structure
    const reportData = [];

    todaysInvoices.forEach(inv => {
      let isCashIn = inv.type === 'SALES' || inv.type === 'PURCHASE_RETURN';
      let isCashOut = inv.type === 'PURCHASE' || inv.type === 'SALES_RETURN';
      
      reportData.push({
        id: `inv-${inv.id}`,
        isManual: false,
        date: inv.date.toISOString(),
        voucherNo: inv.invoiceNo,
        type: isCashIn ? 'Income' : 'Expense',
        particular: `${inv.type.replace(/_/g, ' ')} - ${inv.invoiceNo}`,
        accountName: inv.customer ? inv.customer.name : 'Unknown',
        paymentType: 'Cash',
        cashIn: isCashIn ? inv.totalAmount : 0,
        cashOut: isCashOut ? inv.totalAmount : 0
      });
    });

    todaysCashBook.forEach(cb => {
      reportData.push({
        id: cb.id,
        isManual: true,
        date: cb.date.toISOString(),
        voucherNo: cb.voucherNo,
        type: cb.type,
        particular: cb.particular,
        accountName: cb.accountName,
        paymentType: cb.paymentType,
        cashIn: cb.cashIn,
        cashOut: cb.cashOut
      });
    });

    // Sort by date/time
    reportData.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({ success: true, openingBalance, data: reportData });
  } catch (error) {
    console.error("Error fetching Rojmel data:", error);
    res.status(500).json({ success: false, error: "Failed to fetch Rojmel data" });
  }
};

exports.createRojmelEntry = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { date, type, particular, accountName, paymentType, amount, voucherNo } = req.body;
    
    const cashIn = type === 'Income' ? Number(amount) : 0;
    const cashOut = type === 'Expense' ? Number(amount) : 0;
    const entryDate = date ? new Date(date) : new Date();

    const newEntry = await prisma.cashBook.create({
      data: {
        date: entryDate,
        voucherNo: voucherNo || `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
        type,
        particular,
        accountName,
        paymentType,
        cashIn,
        cashOut,
        companyId
      }
    });
    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error("Error creating Rojmel entry:", error);
    res.status(500).json({ success: false, error: "Failed to create Rojmel entry" });
  }
};

exports.deleteRojmelEntry = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const entry = await prisma.cashBook.findUnique({ where: { id: Number(id) } });
    if (!entry || entry.companyId !== companyId) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }

    await prisma.cashBook.delete({ where: { id: Number(id) } });
    res.status(200).json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting Rojmel entry:", error);
    res.status(500).json({ success: false, error: "Failed to delete Rojmel entry" });
  }
};
