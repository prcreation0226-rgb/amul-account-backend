const express = require('express');
const router = express.Router();
const { getLogs, createLog } = require('../controllers/auditController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.get('/', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), getLogs);
router.post('/', createLog);

module.exports = router;
