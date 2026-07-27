const express = require('express');
const router = express.Router();
const { validateCart, getQuickItems, checkout, processReturns } = require('../controllers/posController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// POS actions restricted to specific roles, usually STAFF or ADMIN
router.post('/cart', requireRole(['STAFF', 'COMPANY_ADMIN', 'SUPERADMIN']), validateCart);
router.get('/quick-items', requireRole(['STAFF', 'COMPANY_ADMIN', 'SUPERADMIN']), getQuickItems);
router.post('/checkout', requireRole(['STAFF', 'COMPANY_ADMIN', 'SUPERADMIN']), checkout);
router.post('/returns', requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), processReturns); // Returns might require higher auth

module.exports = router;
