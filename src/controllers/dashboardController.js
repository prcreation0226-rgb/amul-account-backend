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
    const totalInvoicesCount = await prisma.invoice.count({ where: { companyId } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Sales
    const salesAgg = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { companyId, type: 'SALES', date: { gte: today, lt: tomorrow } }
    });
    const todaysSale = salesAgg._sum.totalAmount || 0;

    // Purchase
    const purchaseAgg = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { companyId, type: 'PURCHASE', date: { gte: today, lt: tomorrow } }
    });
    const todayPurchase = purchaseAgg._sum.totalAmount || 0;

    // Stock
    const stockAgg = await prisma.product.aggregate({
      _sum: { stock: true },
      where: { companyId }
    });
    const currentStockStatus = stockAgg._sum.stock || 0;

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

    // --- Chart Data (Last 30 Days Sales) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const salesInvoices = await prisma.invoice.findMany({
      where: { companyId, type: 'SALES', date: { gte: thirtyDaysAgo } },
      select: { date: true, totalAmount: true }
    });
    const salesByDate = {};
    salesInvoices.forEach(inv => {
      const d = new Date(inv.date);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
      salesByDate[dateStr] = (salesByDate[dateStr] || 0) + inv.totalAmount;
    });
    const chartData = Object.keys(salesByDate).map(date => ({
      name: date,
      sales: salesByDate[date]
    })).sort((a, b) => new Date(a.name) - new Date(b.name));

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
      where: { companyId, status: 'DUE' }
    });

    const remindersCount = followupsCount + dueInvoicesCount;

    const todayCashSales = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { companyId, type: 'SALES', paymentMode: 'Cash', date: { gte: today, lt: tomorrow } }
    });
    const todayCashPurchases = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { companyId, type: 'PURCHASE', paymentMode: 'Cash', date: { gte: today, lt: tomorrow } }
    });
    const cashIn = todayCashSales._sum.totalAmount || 0;
    const cashOut = todayCashPurchases._sum.totalAmount || 0;
    const txnsCount = await prisma.invoice.count({
      where: { companyId, date: { gte: today, lt: tomorrow } }
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
        todaysExpenses: 0,
        customerOutstanding,
        companyOutstanding,
        allAccountsBalance,
        recycleBin: 0,
        chartData,
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
