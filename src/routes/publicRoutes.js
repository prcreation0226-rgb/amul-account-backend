const express = require('express');
const router = express.Router();
const { getPublicBill } = require('../controllers/publicController');

// No auth required — public access
router.get('/bill/:invoiceNo', getPublicBill);

module.exports = router;
