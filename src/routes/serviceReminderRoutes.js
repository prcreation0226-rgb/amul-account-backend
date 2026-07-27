const express = require('express');
const router = express.Router();
const serviceReminderController = require('../controllers/serviceReminderController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', serviceReminderController.getServiceReminders);
router.post('/', serviceReminderController.createServiceReminder);
router.put('/:id', serviceReminderController.updateServiceReminder);
router.delete('/:id', serviceReminderController.deleteServiceReminder);

module.exports = router;
