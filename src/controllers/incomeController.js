const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all incomes for the tenant
exports.getIncomes = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const incomes = await prisma.income.findMany({
      where: { companyId }
    });
    res.status(200).json({ success: true, data: incomes });
  } catch (error) {
    console.error('Error fetching incomes:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new income
exports.createIncome = async (req, res) => {
  const companyId = req.user.companyId;
  const { name, head, isActive } = req.body;
  try {
    const income = await prisma.income.create({
      data: {
        name,
        head: head || null,
        isActive: isActive !== false,
        companyId
      }
    });
    res.status(201).json({ success: true, data: income });
  } catch (error) {
    console.error('Error creating income:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update an existing income
exports.updateIncome = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { name, head, isActive } = req.body;
  try {
    const income = await prisma.income.update({
      where: { id: parseInt(id, 10), companyId },
      data: {
        ...(name && { name }),
        ...(head !== undefined && { head }),
        ...(isActive !== undefined && { isActive })
      }
    });
    res.status(200).json({ success: true, data: income });
  } catch (error) {
    console.error('Error updating income:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete an income
exports.deleteIncome = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.income.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Error deleting income:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Merge incomes (delete source, keep target)
exports.mergeIncomes = async (req, res) => {
  const companyId = req.user.companyId;
  const { sourceIncomeId, targetIncomeId } = req.body;

  if (parseInt(sourceIncomeId, 10) === parseInt(targetIncomeId, 10)) {
    return res.status(400).json({ success: false, message: 'Source and target incomes must be different' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Find source and target
      const source = await tx.income.findFirstOrThrow({
        where: { id: parseInt(sourceIncomeId, 10), companyId }
      });
      const target = await tx.income.findFirstOrThrow({
        where: { id: parseInt(targetIncomeId, 10), companyId }
      });

      // Transfer transaction records from source to target
      await tx.incomeTransaction.updateMany({
        where: { incomeId: source.id },
        data: { incomeId: target.id }
      });

      // Update target balance
      await tx.income.update({
        where: { id: target.id },
        data: { balance: { increment: source.balance } }
      });

      // Delete the source.
      await tx.income.delete({
        where: { id: source.id }
      });
    });

    res.status(200).json({ success: true, message: 'Incomes merged successfully' });
  } catch (error) {
    console.error('Error merging incomes:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get income transactions
exports.getIncomeTransactions = async (req, res) => {
  const companyId = req.user.companyId;
  const incomeId = parseInt(req.params.id, 10);

  try {
    const income = await prisma.income.findUnique({
      where: { id: incomeId, companyId }
    });

    if (!income) {
      return res.status(404).json({ success: false, message: 'Income not found' });
    }

    const transactions = await prisma.incomeTransaction.findMany({
      where: { incomeId, companyId },
      orderBy: { date: 'asc' }
    });

    let entries = [];
    let runningBalance = 0;

    transactions.forEach(t => {
      // Income Amount increases the balance (owed to company / logged income)
      // Paid Amount decreases the balance
      runningBalance += t.incomeAmount;
      runningBalance -= t.paidAmount;
      runningBalance -= t.discount;

      entries.push({
        id: t.id,
        date: t.date,
        incomeAmount: t.incomeAmount,
        paidAmount: t.paidAmount,
        discount: t.discount,
        remark: t.remark,
        balance: runningBalance
      });
    });

    res.status(200).json({
      success: true,
      income: income,
      data: entries
    });
  } catch (error) {
    console.error('Error fetching income transactions:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Add income transaction
exports.addIncomeTransaction = async (req, res) => {
  const companyId = req.user.companyId;
  const incomeId = parseInt(req.params.id, 10);
  const { date, incomeAmount, paidAmount, discount, remark } = req.body;

  try {
    const parsedIncome = parseFloat(incomeAmount) || 0;
    const parsedPaid = parseFloat(paidAmount) || 0;
    const parsedDiscount = parseFloat(discount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.incomeTransaction.create({
        data: {
          date: date ? new Date(date) : new Date(),
          incomeAmount: parsedIncome,
          paidAmount: parsedPaid,
          discount: parsedDiscount,
          remark,
          incomeId,
          companyId
        }
      });

      // Update income balance
      const balanceChange = parsedIncome - (parsedPaid + parsedDiscount);
      await tx.income.update({
        where: { id: incomeId },
        data: { balance: { increment: balanceChange } }
      });

      return transaction;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding income transaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
