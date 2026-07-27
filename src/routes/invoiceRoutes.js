const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, markInvoicePaid } = require('../controllers/invoiceController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.post('/', requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), createInvoice);
router.get('/', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), getInvoices);
router.put('/:id/mark-paid', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), markInvoicePaid);

module.exports = router;
