const express = require('express');
const router = express.Router();
const { getVouchers, createVoucher, updateVoucher, deleteVoucher } = require('../controllers/voucherController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getVouchers);
router.post('/', createVoucher);
router.put('/:id', updateVoucher);
router.delete('/:id', deleteVoucher);

module.exports = router;
