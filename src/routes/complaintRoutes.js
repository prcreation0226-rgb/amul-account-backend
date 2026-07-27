const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', complaintController.getComplaints);
router.post('/', complaintController.createComplaint);
router.put('/:id', complaintController.updateComplaint);
router.delete('/:id', complaintController.deleteComplaint);

module.exports = router;
