const express = require('express');
const router = express.Router();
const recycleBinController = require('../controllers/recycleBinController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.get('/', recycleBinController.getDeletedEntries);
router.post('/restore/:type/:id', recycleBinController.restoreEntry);
router.delete('/permanent/:type/:id', recycleBinController.permanentDelete);

module.exports = router;
