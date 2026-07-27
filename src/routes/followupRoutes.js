const express = require('express');
const router = express.Router();
const followupController = require('../controllers/followupController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/customer/:customerId', followupController.getFollowups);
router.post('/customer/:customerId', followupController.addFollowup);
router.delete('/:id', followupController.deleteFollowup);

module.exports = router;
