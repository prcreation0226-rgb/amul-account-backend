const express = require('express');
const router = express.Router();
const { getPaymentBooks, createPaymentBook, updatePaymentBook, deletePaymentBook, mergePaymentBooks, getPaymentBookTransactions, addPaymentBookTransaction } = require('../controllers/paymentBookController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getPaymentBooks);
router.post('/', requireRole(['COMPANY_ADMIN', 'STAFF']), createPaymentBook);
router.put('/:id', requireRole(['COMPANY_ADMIN', 'STAFF']), updatePaymentBook);
router.delete('/:id', requireRole(['COMPANY_ADMIN']), deletePaymentBook);
router.post('/merge', requireRole(['COMPANY_ADMIN']), mergePaymentBooks);

router.get('/:id/transactions', getPaymentBookTransactions);
router.post('/:id/transactions', addPaymentBookTransaction);

module.exports = router;
