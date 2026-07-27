const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { handleGeneralImport } = require('../controllers/importController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(verifyToken);

router.post('/general', requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), upload.single('file'), handleGeneralImport);

module.exports = router;
