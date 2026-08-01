const express = require('express');
const router = express.Router();
const barcodeSettingController = require('../controllers/barcodeSettingController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Protect all barcode setting routes
router.use(verifyToken);

router.get('/', barcodeSettingController.getBarcodeSettings);
router.post('/', barcodeSettingController.createBarcodeSetting);
router.put('/:id', barcodeSettingController.updateBarcodeSetting);
router.delete('/:id', barcodeSettingController.deleteBarcodeSetting);

module.exports = router;
