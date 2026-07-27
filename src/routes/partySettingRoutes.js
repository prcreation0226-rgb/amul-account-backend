const express = require('express');
const router = express.Router();
const partySettingController = require('../controllers/partySettingController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', partySettingController.getSettings);
router.put('/', partySettingController.upsertSettings);

module.exports = router;
