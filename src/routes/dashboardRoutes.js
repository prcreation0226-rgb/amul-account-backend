const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController.js');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware.js');

// Superadmin dashboard metrics
router.get('/metrics', verifyToken, requireRole(['SUPERADMIN', 'COMPANY_ADMIN', 'STAFF']), dashboardController.getMetrics);

module.exports = router;
