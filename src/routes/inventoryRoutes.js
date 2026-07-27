const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
// Assuming auth middleware exists
const { verifyToken } = require('../middlewares/authMiddleware'); 

// Apply authentication middleware
router.use(verifyToken);

// Generic endpoint for all transaction types (e.g. /api/v1/inventory/sales)
router.post('/:type', inventoryController.createTransaction);
router.get('/:type', inventoryController.getTransactions);

module.exports = router;
