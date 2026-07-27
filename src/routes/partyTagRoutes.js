const express = require('express');
const router = express.Router();
const { getPartyTags, createPartyTag, updatePartyTag, deletePartyTag } = require('../controllers/partyTagController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getPartyTags);
router.post('/', verifyToken, requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), createPartyTag);
router.put('/:id', verifyToken, requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), updatePartyTag);
router.delete('/:id', verifyToken, requireRole(['COMPANY_ADMIN', 'SUPERADMIN']), deletePartyTag);

module.exports = router;
