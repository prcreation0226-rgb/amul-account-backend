const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, currencyController.getCurrencies);

module.exports = router;
