const express = require('express');
const router = express.Router();
const { getPublicBill, getPublicPlans } = require('../controllers/publicController');

// No auth required — public access
router.get('/bill/:invoiceNo', getPublicBill);
router.get('/plans', getPublicPlans);

module.exports = router;
