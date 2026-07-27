const express = require('express');
const router = express.Router();
const { getBanks, createBank, updateBank, deleteBank, mergeBanks, getBankTransactions, addBankTransaction } = require('../controllers/bankController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getBanks);
router.post('/', requireRole(['COMPANY_ADMIN']), createBank);
router.put('/:id', requireRole(['COMPANY_ADMIN']), updateBank);
router.delete('/:id', requireRole(['COMPANY_ADMIN']), deleteBank);
router.get('/:id/transactions', getBankTransactions);
router.post('/:id/transactions', addBankTransaction);

module.exports = router;
