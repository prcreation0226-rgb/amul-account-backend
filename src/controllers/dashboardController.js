const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getMetrics = async (req, res) => {
  try {
    const { role, companyId } = req.user;

    if (role === 'SUPERADMIN') {
      const activeCompanies = await prisma.company.count({ where: { status: 'ACTIVE' } });
      const activeSubscriptions = await prisma.company.count({ where: { status: 'ACTIVE', planId: { not: null } } });
      const inactiveSubscriptions = await prisma.company.count({ where: { status: { not: 'ACTIVE' } } });

      // Calculate real MRR from plan prices
      const companiesWithPlans = await prisma.company.findMany({
        where: { status: 'ACTIVE', planId: { not: null } },
        include: { plan: true }
      });
      const mrr = companiesWithPlans.reduce((sum, c) => sum + (c.plan?.price || 0), 0);

      return res.status(200).json({
        success: true,
        data: {
          totalActiveCompanies: activeCompanies,
          mrr,
          activeSubscriptions,
          inactiveSubscriptions
        }
      });
    }

    // Tenant Metrics
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required for tenant metrics' });
    }

    const totalCustomers = await prisma.customer.count({ where: { companyId } });
    const totalProducts = await prisma.product.count({ where: { companyId } });
    const totalInvoicesCount = await prisma.invoice.count({ where: { companyId, deletedAt: null } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Sales
    const salesAgg = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { companyId, type: 'SALES', deletedAt: null, date: { gte: today, lt: tomorrow } }
    });
    const todaysSale = salesAgg._sum.totalAmount || 0;

    // Purchase
    const purchaseAgg = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { companyId, type: 'PURCHASE', deletedAt: null, date: { gte: today, lt: tomorrow } }
    });
    const todayPurchase = purchaseAgg._sum.totalAmount || 0;

    // Stock Value
    const allProductsValue = await prisma.product.findMany({
      where: { companyId, deletedAt: null },
      select: { stock: true, price: true }
    });
    const currentStockStatus = allProductsValue.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);

    // Outstanding
    const custOutAgg = await prisma.customer.aggregate({
      _sum: { balance: true },
      where: { companyId, type: 'CUSTOMER' }
    });
    const customerOutstanding = custOutAgg._sum.balance || 0;

    const compOutAgg = await prisma.customer.aggregate({
      _sum: { balance: true },
      where: { companyId, type: 'COMPANY' }
    });
    const companyOutstanding = compOutAgg._sum.balance || 0;

    // Bank
    const bankAgg = await prisma.bank.aggregate({
      _sum: { balance: true },
      where: { companyId }
    });
    const allAccountsBalance = bankAgg._sum.balance || 0;

    // --- Chart Data (30 Days & 12 Months Sales) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oneYearAgo = new Date();
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 11);
    oneYearAgo.setDate(1);
    oneYearAgo.setHours(0, 0, 0, 0);

    const [salesInvoices30Days, salesInvoicesYear] = await Promise.all([
      prisma.invoice.findMany({
        where: { companyId, type: 'SALES', deletedAt: null, date: { gte: thirtyDaysAgo } },
        select: { date: true, totalAmount: true }
      }),
      prisma.invoice.findMany({
        where: { companyId, type: 'SALES', deletedAt: null, date: { gte: oneYearAgo } },
        select: { date: true, totalAmount: true }
      })
    ]);

    const salesByDate = {};
    salesInvoices30Days.forEach(inv => {
      const d = new Date(inv.date);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
      salesByDate[dateStr] = (salesByDate[dateStr] || 0) + inv.totalAmount;
    });

    const chartData = Object.keys(salesByDate).map(date => ({
      name: date,
      sales: salesByDate[date]
    })).sort((a, b) => new Date(a.name) - new Date(b.name));

    // 12 Months aggregated data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySalesMap = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(oneYearAgo);
      d.setMonth(d.getMonth() + i);
      const key = monthNames[d.getMonth()];
      monthlySalesMap[key] = 0;
    }

    salesInvoicesYear.forEach(inv => {
      const d = new Date(inv.date);
      const key = monthNames[d.getMonth()];
      if (monthlySalesMap[key] !== undefined) {
        monthlySalesMap[key] += inv.totalAmount;
      }
    });

    const chartData12Months = Object.keys(monthlySalesMap).map(key => ({
      name: key,
      sales: monthlySalesMap[key]
    }));

    // --- Alert Cards Data ---
    const allProductsList = await prisma.product.findMany({ 
      where: { companyId }, 
      select: { stock: true, reorderLevel: true, expiryMonth: true } 
    });
    let reorderCount = 0;
    let expiredCount = 0;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    allProductsList.forEach(p => {
      if (p.stock <= p.reorderLevel) reorderCount++;
      if (p.expiryMonth && p.expiryMonth < currentMonthStr) expiredCount++;
    });

    const followupsCount = await prisma.followup.count({
      where: { customer: { companyId } }
    });

    const dueInvoicesCount = await prisma.invoice.count({
      where: { companyId, status: 'DUE', deletedAt: null }
    });

    const remindersCount = followupsCount + dueInvoicesCount;

    // --- Day Book Summary Data ---
    // Cash In = Sales & Sales Return (paymentIn) + Receipts (paymentIn)
    // Cash Out = Purchase & Purchase Return (paymentOut) + Payments (paymentOut) + Expenses (paidAmount)
    let cashIn = 0;
    let cashOut = 0;
    
    const todaysInvoices = await prisma.invoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: today, lt: tomorrow } }
    });
    
    todaysInvoices.forEach(inv => {
      if (inv.type === 'SALES' || inv.type === 'PURCHASE_RETURN') {
        if (inv.paymentMode && inv.paymentMode.toLowerCase() === 'cash') {
           cashIn += inv.totalAmount;
        }
      } else if (inv.type === 'PURCHASE' || inv.type === 'SALES_RETURN') {
        cashOut += inv.totalAmount;
      }
    });

    const todaysPayments = await prisma.paymentBookTransaction.findMany({
      where: { companyId, date: { gte: today, lt: tomorrow } }
    });

    todaysPayments.forEach(pay => {
      cashIn += (pay.paymentIn || 0);
      cashOut += (pay.paymentOut || 0);
    });

    const todaysExpenses = await prisma.expenseTransaction.findMany({
      where: { companyId, date: { gte: today, lt: tomorrow } }
    });

    let todaysExpensesTotal = 0;
    todaysExpenses.forEach(exp => {
      cashOut += (exp.paidAmount || 0);
      todaysExpensesTotal += (exp.expenseAmount || 0);
    });

    const txnsCount = todaysInvoices.length + todaysPayments.length + todaysExpenses.length;

    const recycleBinCount = await prisma.invoice.count({
      where: { companyId, deletedAt: { not: null } }
    });

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        totalProducts,
        totalInvoices: totalInvoicesCount,
        todaysSale,
        todayPurchase,
        currentStockStatus,
        todaysExpenses: todaysExpensesTotal,
        customerOutstanding,
        companyOutstanding,
        allAccountsBalance,
        recycleBin: recycleBinCount,
        chartData,
        chartData12Months,
        alerts: {
          expiredCount,
          reorderCount,
          remindersCount,
          daybook: {
            receipts: cashIn,
            payments: cashOut,
            cashIn,
            cashOut,
            balance: cashIn - cashOut,
            txnsCount
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
