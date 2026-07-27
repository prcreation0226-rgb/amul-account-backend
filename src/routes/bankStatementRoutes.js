const express = require('express');
const router = express.Router();
const bankStatementController = require('../controllers/bankStatementController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', bankStatementController.getBankStatements);
router.post('/', bankStatementController.uploadMiddleware, bankStatementController.uploadBankStatement);
router.delete('/:id', bankStatementController.deleteBankStatement);

module.exports = router;
