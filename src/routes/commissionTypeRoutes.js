const express = require('express');
const router = express.Router();
const { getCommissionTypes, createCommissionType } = require('../controllers/commissionTypeController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getCommissionTypes);
router.post('/', createCommissionType);

module.exports = router;
