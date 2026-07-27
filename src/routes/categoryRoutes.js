const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getCategories);
router.post('/', requireRole(['COMPANY_ADMIN']), createCategory);
router.put('/:id', requireRole(['COMPANY_ADMIN']), updateCategory);
router.delete('/:id', requireRole(['COMPANY_ADMIN']), deleteCategory);

module.exports = router;
