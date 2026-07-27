const express = require('express');
const router = express.Router();
const { getProductTags, createProductTag } = require('../controllers/productTagController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', getProductTags);
router.post('/', createProductTag);

module.exports = router;
