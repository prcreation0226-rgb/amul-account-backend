const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, updateExpense, deleteExpense, mergeExpenses, getExpenseTransactions, addExpenseTransaction, deleteExpenseTransaction } = require('../controllers/expenseController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getExpenses);
router.post('/', requireRole(['COMPANY_ADMIN', 'STAFF']), createExpense);
router.put('/:id', requireRole(['COMPANY_ADMIN', 'STAFF']), updateExpense);
router.post('/merge', requireRole(['COMPANY_ADMIN']), mergeExpenses);

router.get('/:id/transactions', getExpenseTransactions);
router.post('/:id/transactions', addExpenseTransaction);

// Specific route MUST come before generic /:id to avoid conflict
router.delete('/transactions/:transactionId', requireRole(['COMPANY_ADMIN']), deleteExpenseTransaction);
router.delete('/:id', requireRole(['COMPANY_ADMIN']), deleteExpense);

module.exports = router;
