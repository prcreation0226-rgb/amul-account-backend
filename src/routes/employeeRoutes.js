const express = require('express');
const router = express.Router();
const { getEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployeeTransactions, addEmployeeTransaction, deleteEmployeeTransaction, getAttendance, markAttendance } = require('../controllers/employeeController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getEmployees);
router.post('/', requireRole(['COMPANY_ADMIN']), createEmployee);
router.put('/:id', requireRole(['COMPANY_ADMIN']), updateEmployee);
router.delete('/:id', requireRole(['COMPANY_ADMIN']), deleteEmployee);

router.get('/:id/transactions', getEmployeeTransactions);
router.post('/:id/transactions', addEmployeeTransaction);
router.delete('/transactions/:transactionId', deleteEmployeeTransaction);

router.get('/attendance/month', getAttendance);
router.post('/attendance/mark', requireRole(['COMPANY_ADMIN']), markAttendance);

module.exports = router;
