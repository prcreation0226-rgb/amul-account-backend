const express = require('express');
const router = express.Router();
const { getPlans, createPlan, updatePlan, deletePlan, upgradeSubscription } = require('../controllers/planController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// All plan routes require authentication
router.use(verifyToken);

router.get('/', getPlans);
router.post('/', requireRole(['SUPERADMIN']), createPlan);
router.put('/:id', requireRole(['SUPERADMIN']), updatePlan);
router.delete('/:id', requireRole(['SUPERADMIN']), deletePlan);

router.post('/upgrade', requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), upgradeSubscription);

module.exports = router;
