const express = require('express');
const router = express.Router();
const unitConversionController = require('../controllers/unitConversionController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.post('/', unitConversionController.createConversion);
router.get('/', unitConversionController.getConversions);
router.put('/:id', unitConversionController.updateConversion);
router.delete('/:id', unitConversionController.deleteConversion);

module.exports = router;
