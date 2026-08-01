const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
// Assuming auth middleware exists
const { verifyToken } = require('../middlewares/authMiddleware'); 

// Apply authentication middleware
router.use(verifyToken);

// Generic endpoint for all transaction types (e.g. /api/v1/inventory/sales)
router.get('/single/:id', inventoryController.getTransactionById);
router.get('/batches/:productId', inventoryController.getBatchesByProductId);
router.post('/:type', inventoryController.createTransaction);
router.get('/:type', inventoryController.getTransactions);
router.delete('/:id', inventoryController.deleteTransaction);

module.exports = router;
