const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all expenses for the tenant
exports.getExpenses = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const expenses = await prisma.expense.findMany({
      where: { companyId }
    });
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new expense
exports.createExpense = async (req, res) => {
  const companyId = req.user.companyId;
  const { name, head, type, isActive } = req.body;
  try {
    const expense = await prisma.expense.create({
      data: {
        name,
        head,
        type,
        isActive: isActive !== false,
        companyId
      }
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update an existing expense
exports.updateExpense = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { name, head, type, isActive } = req.body;
  try {
    const expense = await prisma.expense.update({
      where: { id: parseInt(id, 10), companyId },
      data: {
        ...(name && { name }),
        ...(head !== undefined && { head }),
        ...(type !== undefined && { type }),
        ...(isActive !== undefined && { isActive })
      }
    });
    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.expense.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Merge expenses (delete source, keep target)
exports.mergeExpenses = async (req, res) => {
  const companyId = req.user.companyId;
  const { sourceExpenseId, targetExpenseId } = req.body;

  if (parseInt(sourceExpenseId, 10) === parseInt(targetExpenseId, 10)) {
    return res.status(400).json({ success: false, message: 'Source and target expenses must be different' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Find source and target
      const source = await tx.expense.findFirstOrThrow({
        where: { id: parseInt(sourceExpenseId, 10), companyId }
      });
      const target = await tx.expense.findFirstOrThrow({
        where: { id: parseInt(targetExpenseId, 10), companyId }
      });

      // Transfer transaction records from source to target
      await tx.expenseTransaction.updateMany({
        where: { expenseId: source.id },
        data: { expenseId: target.id }
      });

      // Update target balance
      await tx.expense.update({
        where: { id: target.id },
        data: { balance: { increment: source.balance } }
      });

      // Delete the source.
      await tx.expense.delete({
        where: { id: source.id }
      });
    });

    res.status(200).json({ success: true, message: 'Expenses merged successfully' });
  } catch (error) {
    console.error('Error merging expenses:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get expense transactions
exports.getExpenseTransactions = async (req, res) => {
  const companyId = req.user.companyId;
  const expenseId = parseInt(req.params.id, 10);

  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId, companyId }
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const transactions = await prisma.expenseTransaction.findMany({
      where: { expenseId, companyId },
      orderBy: { date: 'asc' }
    });

    let entries = [];
    let runningBalance = 0;

    transactions.forEach(t => {
      // Expense Amount increases the balance (owed by company / logged expense)
      // Paid Amount decreases the balance
      runningBalance += t.expenseAmount;
      runningBalance -= t.paidAmount;
      runningBalance -= t.discount;

      entries.push({
        id: t.id,
        date: t.date,
        expenseAmount: t.expenseAmount,
        paidAmount: t.paidAmount,
        discount: t.discount,
        remark: t.remark,
        balance: runningBalance
      });
    });

    res.status(200).json({
      success: true,
      expense: expense,
      data: entries
    });
  } catch (error) {
    console.error('Error fetching expense transactions:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Add expense transaction
exports.addExpenseTransaction = async (req, res) => {
  const companyId = req.user.companyId;
  const expenseId = parseInt(req.params.id, 10);
  const { date, expenseAmount, paidAmount, discount, remark } = req.body;

  try {
    const parsedExpense = parseFloat(expenseAmount) || 0;
    const parsedPaid = parseFloat(paidAmount) || 0;
    const parsedDiscount = parseFloat(discount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.expenseTransaction.create({
        data: {
          date: date ? new Date(date) : new Date(),
          expenseAmount: parsedExpense,
          paidAmount: parsedPaid,
          discount: parsedDiscount,
          remark,
          expenseId,
          companyId
        }
      });

      // Update expense balance
      const balanceChange = parsedExpense - (parsedPaid + parsedDiscount);
      await tx.expense.update({
        where: { id: expenseId },
        data: { balance: { increment: balanceChange } }
      });

      return transaction;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding expense transaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
