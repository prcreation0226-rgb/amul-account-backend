const express = require('express');
const router = express.Router();
const { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerStats, balanceCorrection } = require('../controllers/customerController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getCustomers);
router.post('/balance-correction', requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), balanceCorrection);
router.get('/:id/stats', getCustomerStats);
router.post('/', requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), createCustomer);
router.put('/:id', requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), updateCustomer);
router.delete('/:id', requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), deleteCustomer);

module.exports = router;
