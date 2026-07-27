const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getLedger = async (req, res) => {
  const companyId = req.user.companyId;
  const { customerId } = req.params;
  const { fromDate, toDate } = req.query;

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

  try {
    // 1. Get customer
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId, 10), companyId }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // 2. Get all SALES invoices (Debit entries)
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId: parseInt(customerId, 10),
        companyId,
        type: 'SALES',
        deletedAt: null,
        ...dateFilter
      },
      orderBy: { date: 'asc' }
    });

    // 3. Get all SALES RETURN invoices (Credit entries - reduces balance)
    const salesReturns = await prisma.invoice.findMany({
      where: {
        customerId: parseInt(customerId, 10),
        companyId,
        type: 'SALES_RETURN',
        deletedAt: null,
        ...dateFilter
      },
      orderBy: { date: 'asc' }
    });

    // 4. Get all customer payments from CustomerPayment table
    const payments = await prisma.customerPayment.findMany({
      where: {
        customerId: parseInt(customerId, 10),
        companyId,
        ...dateFilter
      },
      orderBy: { date: 'asc' }
    });

    // 5. Build ledger entries array
    let entries = [];

    // Add sales invoices as DEBIT entries
    invoices.forEach(inv => {
      const isPaid = inv.status === 'PAID' || inv.paymentMode !== 'Credit';
      entries.push({
        id: `INV-${inv.id}`,
        rawId: inv.id,
        type: 'INVOICE',
        date: inv.date,
        voucherNo: inv.invoiceNo,
        amount: inv.totalAmount,    // Debit (customer owes us)
        paymentIn: isPaid ? inv.totalAmount : 0, // Credit (payment received)
        discount: inv.totalDiscount || 0,
        paymentMode: inv.paymentMode || 'Cash',
        remark: inv.remark || null
      });
    });

    // Add sales returns as CREDIT entries (reduces what customer owes)
    salesReturns.forEach(ret => {
      entries.push({
        id: `RET-${ret.id}`,
        rawId: ret.id,
        type: 'SALES_RETURN',
        date: ret.date,
        voucherNo: ret.invoiceNo,
        amount: 0,
        paymentIn: ret.totalAmount,  // Treated as credit
        discount: 0,
        paymentMode: ret.paymentMode || 'Cash',
        remark: ret.remark || 'Sales Return'
      });
    });

    // Add payments from CustomerPayment table
    payments.forEach(pay => {
      const isIn = pay.paymentType === 'IN';
      entries.push({
        id: `PAY-${pay.id}`,
        rawId: pay.id,
        type: isIn ? 'PAYMENT_IN' : 'PAYMENT_OUT',
        date: pay.date,
        voucherNo: String(pay.id),
        amount: isIn ? 0 : pay.amount,       // OUT = debit (we owe them)
        paymentIn: isIn ? pay.amount : 0,    // IN = credit (they paid us)
        discount: pay.discount || 0,
        paymentMode: pay.paymentMode || 'Cash',
        remark: pay.remark || null
      });
    });

    // 6. Sort all entries by date ascending
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 7. Calculate running balance
    // Balance = total invoiced (debit) - total payments received (credit) - discounts
    let runningBalance = 0;
    entries = entries.map(entry => {
      runningBalance += entry.amount;       // Debit (invoice raised or payment out)
      runningBalance -= entry.paymentIn;   // Credit (payment received or return)
      runningBalance -= entry.discount;    // Discount reduces balance
      return {
        ...entry,
        balance: runningBalance
      };
    });

    res.status(200).json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        balance: customer.balance,
        details: `${customer.city || ''} ${customer.mobile ? `Mobile: ${customer.mobile}` : ''}`
      },
      data: entries
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.addPayment = async (req, res) => {
  const companyId = req.user.companyId;
  const { customerId } = req.params;
  const { date, amount, paymentType, paymentMode, referenceNo, discount, remark } = req.body;

  try {
    const parsedAmount = parseFloat(amount) || 0;
    const parsedDiscount = parseFloat(discount) || 0;

    // Payment IN = customer paid us -> balance decreases
    // Payment OUT = we paid customer -> balance increases
    let balanceAdjustment = 0;
    if (paymentType === 'IN') {
      balanceAdjustment = -(parsedAmount + parsedDiscount);
    } else {
      balanceAdjustment = (parsedAmount + parsedDiscount);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Save payment record in CustomerPayment table
      const payment = await tx.customerPayment.create({
        data: {
          date: date ? new Date(date) : new Date(),
          amount: parsedAmount,
          discount: parsedDiscount,
          paymentType: paymentType || 'IN',
          paymentMode: paymentMode || 'Cash',
          remark: remark || null,
          customerId: parseInt(customerId, 10),
          companyId
        }
      });

      // Update customer balance
      const updatedCustomer = await tx.customer.update({
        where: { id: parseInt(customerId, 10) },
        data: {
          balance: { increment: balanceAdjustment }
        }
      });

      return { payment, newBalance: updatedCustomer.balance };
    });

    res.status(201).json({
      success: true,
      data: {
        customerId: parseInt(customerId, 10),
        amount: parsedAmount,
        discount: parsedDiscount,
        paymentType,
        remark,
        newBalance: result.newBalance
      }
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deletePayment = async (req, res) => {
  const companyId = req.user.companyId;
  const { paymentId } = req.params;

  try {
    const payment = await prisma.customerPayment.findFirst({
      where: { id: parseInt(paymentId, 10), companyId }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Delete the payment record
      await tx.customerPayment.delete({
        where: { id: payment.id }
      });

      // Update customer balance (Payment IN was negative, so we subtract the adjustment, meaning we add it back)
      // Payment OUT was positive, so we subtract the adjustment
      const balanceAdjustment = payment.paymentType === 'IN' 
        ? (payment.amount + payment.discount) 
        : -(payment.amount + payment.discount);

      await tx.customer.update({
        where: { id: payment.customerId },
        data: {
          balance: { increment: balanceAdjustment }
        }
      });
    });

    res.status(200).json({ success: true, message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

