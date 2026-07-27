const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all employees for the tenant
exports.getEmployees = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const employees = await prisma.employee.findMany({
      where: { companyId }
    });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a new employee
exports.createEmployee = async (req, res) => {
  const companyId = req.user.companyId;
  const { 
    name, mobile, city, joiningDate, designation, salary, 
    paidHoliday, commission, specialCommission, totalSaleCommission, 
    commissionOnManufacturing, openingBalance, openingBalanceType 
  } = req.body;
  try {
    // Check user limit based on subscription plan
    const companyWithPlan = await prisma.company.findUnique({
      where: { id: companyId },
      include: { plan: true }
    });
    
    if (companyWithPlan && companyWithPlan.plan && companyWithPlan.plan.features) {
      let features = companyWithPlan.plan.features;
      if (typeof features === 'string') {
        try { features = JSON.parse(features); } catch(e){}
      }
      const userLimit = features.userLimit || features.users;
      if (userLimit && String(userLimit).toLowerCase() !== 'unlimited') {
        const currentEmployeeCount = await prisma.employee.count({ where: { companyId } });
        if (currentEmployeeCount >= parseInt(userLimit, 10)) {
          return res.status(400).json({ success: false, message: `User limit reached for your current plan (${userLimit} users). Please upgrade your plan.` });
        }
      }
    }

    let initialBalance = 0;
    if (openingBalance) {
      initialBalance = parseFloat(openingBalance);
      if (openingBalanceType === 'ADVANCE') {
        initialBalance = -Math.abs(initialBalance);
      }
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        mobile: mobile || null,
        city: city || null,
        joiningDate: joiningDate || null,
        designation: designation || null,
        salary: parseFloat(salary) || 0,
        paidHoliday: parseInt(paidHoliday, 10) || 0,
        commission: parseFloat(commission) || 0,
        specialCommission: parseFloat(specialCommission) || 0,
        totalSaleCommission: parseFloat(totalSaleCommission) || 0,
        commissionOnManufacturing: parseFloat(commissionOnManufacturing) || 0,
        balance: initialBalance,
        companyId
      }
    });

    if (initialBalance !== 0) {
      await prisma.employeeTransaction.create({
        data: {
          date: new Date(),
          type: 'OPENING_BALANCE',
          amount: Math.abs(initialBalance),
          remark: `Opening Balance (${openingBalanceType || 'DUE'})`,
          employeeId: employee.id,
          companyId
        }
      });
    }

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update employee details
exports.updateEmployee = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const employeeId = parseInt(id, 10);
  const { 
    name, mobile, city, joiningDate, designation, salary, 
    paidHoliday, commission, specialCommission, totalSaleCommission, 
    commissionOnManufacturing, openingBalance, openingBalanceType 
  } = req.body;

  try {
    const employee = await prisma.$transaction(async (tx) => {
      // 1. Update basic details
      let updatedEmp = await tx.employee.update({
        where: { id: employeeId, companyId },
        data: {
          ...(name && { name }),
          ...(mobile !== undefined && { mobile }),
          ...(city !== undefined && { city }),
          ...(joiningDate !== undefined && { joiningDate }),
          ...(designation !== undefined && { designation }),
          ...(salary !== undefined && { salary: parseFloat(salary) }),
          ...(paidHoliday !== undefined && { paidHoliday: parseInt(paidHoliday, 10) }),
          ...(commission !== undefined && { commission: parseFloat(commission) }),
          ...(specialCommission !== undefined && { specialCommission: parseFloat(specialCommission) }),
          ...(totalSaleCommission !== undefined && { totalSaleCommission: parseFloat(totalSaleCommission) }),
          ...(commissionOnManufacturing !== undefined && { commissionOnManufacturing: parseFloat(commissionOnManufacturing) })
        }
      });

      // 2. Handle Opening Balance logic if provided
      if (openingBalance !== undefined) {
        let newInitialBalance = parseFloat(openingBalance) || 0;
        const newAbsAmount = Math.abs(newInitialBalance);
        let currentInitialBalance = 0;
        
        const existingTx = await tx.employeeTransaction.findFirst({
           where: { employeeId: employeeId, type: 'OPENING_BALANCE' }
        });

        if (existingTx) {
           currentInitialBalance = existingTx.remark.includes('ADVANCE') ? -existingTx.amount : existingTx.amount;
        }

        const requestedSignedBalance = (openingBalanceType === 'ADVANCE') ? -newAbsAmount : newAbsAmount;
        const diff = requestedSignedBalance - currentInitialBalance;

        if (diff !== 0) {
           if (existingTx) {
             await tx.employeeTransaction.update({
               where: { id: existingTx.id },
               data: {
                 amount: newAbsAmount,
                 remark: `Opening Balance (${openingBalanceType || 'DUE'})`
               }
             });
           } else if (newAbsAmount > 0) {
             await tx.employeeTransaction.create({
               data: {
                 date: new Date(),
                 type: 'OPENING_BALANCE',
                 amount: newAbsAmount,
                 remark: `Opening Balance (${openingBalanceType || 'DUE'})`,
                 employeeId: employeeId,
                 companyId
               }
             });
           }

           updatedEmp = await tx.employee.update({
             where: { id: employeeId },
             data: { balance: { increment: diff } }
           });
        }
      }
      return updatedEmp;
    });

    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  try {
    await prisma.employee.delete({
      where: { id: parseInt(id, 10), companyId }
    });
    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get employee transactions
exports.getEmployeeTransactions = async (req, res) => {
  const companyId = req.user.companyId;
  const employeeId = parseInt(req.params.id, 10);

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId, companyId }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const transactions = await prisma.employeeTransaction.findMany({
      where: { employeeId, companyId },
      orderBy: { date: 'asc' }
    });

    let entries = [];
    let runningBalance = 0;

    transactions.forEach(t => {
      if (t.type === 'SALARY') {
        runningBalance += t.amount;
      } else if (t.type === 'PAYMENT') {
        runningBalance -= t.amount;
        runningBalance -= (t.discount || 0);
      } else if (t.type === 'OPENING_BALANCE') {
        if (t.remark && t.remark.includes('ADVANCE')) {
          runningBalance -= t.amount;
        } else {
          runningBalance += t.amount;
        }
      }

      entries.push({
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        discount: t.discount,
        remark: t.remark,
        balance: runningBalance
      });
    });

    res.status(200).json({
      success: true,
      employee: employee,
      data: entries
    });
  } catch (error) {
    console.error('Error fetching employee transactions:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Add employee transaction (Salary or Payment)
exports.addEmployeeTransaction = async (req, res) => {
  const companyId = req.user.companyId;
  const employeeId = parseInt(req.params.id, 10);
  const { date, type, amount, discount, remark } = req.body;
  // type should be "SALARY" or "PAYMENT"

  try {
    const parsedAmount = parseFloat(amount) || 0;
    const parsedDiscount = parseFloat(discount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.employeeTransaction.create({
        data: {
          date: date ? new Date(date) : new Date(),
          type: type || 'PAYMENT',
          amount: parsedAmount,
          discount: parsedDiscount,
          remark,
          employeeId,
          companyId
        }
      });

      // Update employee balance
      // Salary -> increment
      // Payment -> decrement
      if (type === 'SALARY') {
        await tx.employee.update({
          where: { id: employeeId },
          data: { balance: { increment: parsedAmount } }
        });
      } else {
        await tx.employee.update({
          where: { id: employeeId },
          data: { balance: { decrement: parsedAmount + parsedDiscount } }
        });
      }

      return transaction;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding employee transaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete employee transaction
exports.deleteEmployeeTransaction = async (req, res) => {
  const companyId = req.user.companyId;
  const transactionId = parseInt(req.params.transactionId, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find the transaction
      const transaction = await tx.employeeTransaction.findUnique({
        where: { id: transactionId, companyId }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // We cannot easily delete OPENING_BALANCE from here without messing up initial setup, but let's allow if needed, 
      // though typically OPENING_BALANCE is managed via Employee Master.
      // Reverse the balance impact
      if (transaction.type === 'SALARY') {
        await tx.employee.update({
          where: { id: transaction.employeeId },
          data: { balance: { decrement: transaction.amount } }
        });
      } else if (transaction.type === 'PAYMENT') {
        await tx.employee.update({
          where: { id: transaction.employeeId },
          data: { balance: { increment: transaction.amount + (transaction.discount || 0) } }
        });
      } else if (transaction.type === 'OPENING_BALANCE') {
        if (transaction.remark && transaction.remark.includes('ADVANCE')) {
           await tx.employee.update({
             where: { id: transaction.employeeId },
             data: { balance: { increment: transaction.amount } }
           });
        } else {
           await tx.employee.update({
             where: { id: transaction.employeeId },
             data: { balance: { decrement: transaction.amount } }
           });
        }
      }

      // Delete the transaction
      await tx.employeeTransaction.delete({
        where: { id: transactionId }
      });

      return transaction;
    });

    res.status(200).json({ success: true, message: 'Transaction deleted successfully', data: result });
  } catch (error) {
    console.error('Error deleting employee transaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get employee attendance
exports.getAttendance = async (req, res) => {
  const companyId = req.user.companyId;
  const { month } = req.query; // format: YYYY-MM
  try {
    let whereClause = { companyId };
    
    if (month) {
      const startDate = new Date(`${month}-01T00:00:00.000Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      whereClause.date = {
        gte: startDate,
        lt: endDate
      };
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { name: true }
        }
      }
    });

    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Mark employee attendance
exports.markAttendance = async (req, res) => {
  const companyId = req.user.companyId;
  const { employeeId, date, status } = req.body;
  try {
    const attendanceDate = new Date(date);
    
    // Upsert attendance record
    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: parseInt(employeeId, 10),
          date: attendanceDate
        }
      },
      update: {
        status
      },
      create: {
        employeeId: parseInt(employeeId, 10),
        companyId,
        date: attendanceDate,
        status
      }
    });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
