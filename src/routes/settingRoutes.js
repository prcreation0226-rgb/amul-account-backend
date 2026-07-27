const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', settingController.getSettings);
router.put('/', settingController.updateSettings);
router.post('/reset-database', settingController.resetDatabase);

module.exports = router;
