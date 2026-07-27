const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all customers/parties for the tenant
exports.getCustomers = async (req, res) => {
  const companyId = req.user.companyId;
  const { type, search } = req.query;
  try {
    const customers = await prisma.customer.findMany({ 
      where: { 
        companyId,
        ...(type && { type }),
        ...(search && search.trim() !== '' && {
          OR: [
            { name: { contains: search.trim() } },
            { mobile: { contains: search.trim() } },
            { phone: { contains: search.trim() } },
          ]
        })
      },
      ...(search && { take: 10 }),
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new customer/party for the tenant
exports.createCustomer = async (req, res) => {
  const companyId = req.user.companyId;
  const { 
    name, phone, address, gstin, mobile, partyTags, balance, status, type,
    dueDays, drugLicense, pinCode, gstApplicable, state, email, partyType,
    otherMobileNo, partyLimit, interestRate, loyaltyPoints, joiningDate,
    wholeParty, sezParty, focParty, city
  } = req.body;
  try {
    const customer = await prisma.customer.create({
      data: { 
        name, 
        phone, 
        address, 
        gstin, 
        mobile, 
        partyTags, 
        balance: balance ? parseFloat(balance) : 0, 
        status: status || 'Active',
        type: type || 'CUSTOMER',
        city,
        dueDays: dueDays ? parseInt(dueDays, 10) : 7,
        drugLicense,
        pinCode,
        gstApplicable,
        state,
        email,
        partyType,
        otherMobileNo,
        partyLimit: partyLimit ? parseFloat(partyLimit) : 0,
        interestRate: interestRate ? parseFloat(interestRate) : 0,
        loyaltyPoints: loyaltyPoints ? parseInt(loyaltyPoints, 10) : 0,
        joiningDate,
        wholeParty: wholeParty === true,
        sezParty: sezParty === true,
        focParty: focParty === true,
        companyId 
      }
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update customer/party
exports.updateCustomer = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { 
    name, phone, address, gstin, mobile, partyTags, balance, status,
    dueDays, drugLicense, pinCode, gstApplicable, state, email, partyType,
    otherMobileNo, partyLimit, interestRate, loyaltyPoints, joiningDate,
    wholeParty, sezParty, focParty, city
  } = req.body;
  try {
    const customer = await prisma.customer.update({
      where: { id: parseInt(id, 10), companyId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(gstin !== undefined && { gstin }),
        ...(mobile !== undefined && { mobile }),
        ...(partyTags !== undefined && { partyTags }),
        ...(balance !== undefined && { balance: parseFloat(balance) }),
        ...(status && { status }),
        ...(city !== undefined && { city }),
        ...(dueDays !== undefined && { dueDays: parseInt(dueDays, 10) }),
        ...(drugLicense !== undefined && { drugLicense }),
        ...(pinCode !== undefined && { pinCode }),
        ...(gstApplicable !== undefined && { gstApplicable }),
        ...(state !== undefined && { state }),
        ...(email !== undefined && { email }),
        ...(partyType !== undefined && { partyType }),
        ...(otherMobileNo !== undefined && { otherMobileNo }),
        ...(partyLimit !== undefined && { partyLimit: parseFloat(partyLimit) }),
        ...(interestRate !== undefined && { interestRate: parseFloat(interestRate) }),
        ...(loyaltyPoints !== undefined && { loyaltyPoints: parseInt(loyaltyPoints, 10) }),
        ...(joiningDate !== undefined && { joiningDate }),
        ...(wholeParty !== undefined && { wholeParty }),
        ...(sezParty !== undefined && { sezParty }),
        ...(focParty !== undefined && { focParty })
      }
    });
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete customer/party
exports.deleteCustomer = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.customer.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'Party deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get stats for a customer (Joining date, Total Billing, Last Transaction)
exports.getCustomerStats = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  
  try {
    const customerId = parseInt(id, 10);
    const customer = await prisma.customer.findUnique({
      where: { id: customerId, companyId }
    });
    
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    const invoices = await prisma.invoice.findMany({
      where: { 
        companyId, 
        customerId: customer.id,
        status: { not: 'CANCELLED' } 
      },
      orderBy: { date: 'desc' },
      select: { date: true, totalAmount: true, type: true }
    });
    
    // total billing is sum of all transaction amounts.
    const totalBilling = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const lastTransaction = invoices.length > 0 ? invoices[0].date : null;
    
    res.status(200).json({
      success: true,
      data: {
        joiningDate: customer.joiningDate || customer.createdAt,
        totalBilling,
        lastTransaction,
        dueAmount: customer.balance
      }
    });
  } catch(error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Recalculate balances for all customers and suppliers
exports.balanceCorrection = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const customers = await prisma.customer.findMany({ where: { companyId }, select: { id: true, type: true } });

    // Calculate total credit sales for each customer (Increases balance)
    const creditSales = await prisma.invoice.groupBy({
      by: ['customerId'],
      where: { companyId, type: 'SALES', paymentMode: 'Credit', customerId: { not: null } },
      _sum: { totalAmount: true }
    });

    // Calculate total credit sales returns for each customer (Decreases balance)
    const creditReturns = await prisma.invoice.groupBy({
      by: ['customerId'],
      where: { companyId, type: 'SALES_RETURN', paymentMode: 'Credit', customerId: { not: null } },
      _sum: { totalAmount: true }
    });

    // For suppliers: Purchase increases balance (we owe them), Purchase Return decreases balance
    const creditPurchases = await prisma.invoice.groupBy({
      by: ['customerId'], // Assuming supplier is stored in customerId
      where: { companyId, type: 'PURCHASE', paymentMode: 'Credit', customerId: { not: null } },
      _sum: { totalAmount: true }
    });

    const creditPurchaseReturns = await prisma.invoice.groupBy({
      by: ['customerId'],
      where: { companyId, type: 'PURCHASE_RETURN', paymentMode: 'Credit', customerId: { not: null } },
      _sum: { totalAmount: true }
    });

    const salesMap = {};
    creditSales.forEach(s => salesMap[s.customerId] = s._sum.totalAmount || 0);

    const returnsMap = {};
    creditReturns.forEach(r => returnsMap[r.customerId] = r._sum.totalAmount || 0);

    const purchaseMap = {};
    creditPurchases.forEach(p => purchaseMap[p.customerId] = p._sum.totalAmount || 0);

    const purchaseReturnsMap = {};
    creditPurchaseReturns.forEach(pr => purchaseReturnsMap[pr.customerId] = pr._sum.totalAmount || 0);

    await prisma.$transaction(async (tx) => {
      for (const customer of customers) {
        let calculatedBalance = 0;
        if (customer.type === 'Supplier') {
          // Balance = Purchases - Purchase Returns
          calculatedBalance = (purchaseMap[customer.id] || 0) - (purchaseReturnsMap[customer.id] || 0);
        } else {
          // Balance = Sales - Sales Returns
          calculatedBalance = (salesMap[customer.id] || 0) - (returnsMap[customer.id] || 0);
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: { balance: calculatedBalance }
        });
      }
    });

    res.status(200).json({ success: true, message: 'All balances corrected successfully' });
  } catch (error) {
    console.error('Balance correction error:', error);
    res.status(500).json({ success: false, message: 'Server error during balance correction' });
  }
};
