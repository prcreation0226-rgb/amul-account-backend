const express = require('express');
const router = express.Router();
const { getLedger, addPayment, deletePayment } = require('../controllers/ledgerController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/:customerId', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), getLedger);
router.post('/:customerId/payment', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), addPayment);
router.delete('/payment/:paymentId', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), deletePayment);

module.exports = router;
