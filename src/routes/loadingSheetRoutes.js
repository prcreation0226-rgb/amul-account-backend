const express = require('express');
const router = express.Router();
const loadingSheetController = require('../controllers/loadingSheetController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, loadingSheetController.createLoadingSheet);
router.post('/generate-pdf', verifyToken, loadingSheetController.generatePDF);

module.exports = router;
