const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.post('/', unitController.createUnit);
router.get('/', unitController.getUnits);
router.put('/:id', unitController.updateUnit);
router.delete('/:id', unitController.deleteUnit);

module.exports = router;
