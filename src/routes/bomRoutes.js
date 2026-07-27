const express = require('express');
const router = express.Router();
const { getBoms, createBom, deleteBom, updateBom } = require('../controllers/bomController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getBoms);
router.post('/', requireRole(['COMPANY_ADMIN', 'STAFF']), createBom);
router.put('/:id', requireRole(['COMPANY_ADMIN', 'STAFF']), updateBom);
router.delete('/:id', requireRole(['COMPANY_ADMIN']), deleteBom);

module.exports = router;
