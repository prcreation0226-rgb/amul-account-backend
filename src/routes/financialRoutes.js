const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/collections', financialController.getCollectionReport);
router.get('/day-book-summary', financialController.getDayBookSummary);
router.get('/brandwise-sale', financialController.getBrandwiseSale);
router.get('/brandwise-purchase', financialController.getBrandwisePurchase);
router.get('/categorywise-sale', financialController.getCategorywiseSale);
router.get('/categorywise-purchase', financialController.getCategorywisePurchase);
router.get('/itemwise-sale', financialController.getItemwiseSale);
router.get('/itemwise-purchase', financialController.getItemwisePurchase);
router.get('/employeewise-sale', financialController.getEmployeewiseSale);
router.get('/invoices-report', financialController.getInvoicesReport);
router.get('/trading-account', financialController.getTradingAccount);
router.get('/profit-loss', financialController.getProfitLoss);
router.get('/balance-sheet', financialController.getBalanceSheet);
router.get('/tcs-report', financialController.getTcsReport);

router.get('/rojmel', financialController.getRojmel);
router.post('/rojmel', financialController.createRojmelEntry);
router.delete('/rojmel/:id', financialController.deleteRojmelEntry);

module.exports = router;

