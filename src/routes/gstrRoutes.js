const express = require('express');
const router = express.Router();
const { getGstr1Summary, getGstr2Summary, getGstr3bSummary, getSaleSummaryReport } = require('../controllers/gstrController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/gstr-1', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), getGstr1Summary);
router.get('/gstr-2', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), getGstr2Summary);
router.get('/gstr-3b', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), getGstr3bSummary);
router.get('/sale-summary', requireRole(['COMPANY_ADMIN', 'SUPERADMIN', 'STAFF']), getSaleSummaryReport);
module.exports = router;
