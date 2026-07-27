const express = require('express');
const router = express.Router();
const messageTemplateController = require('../controllers/messageTemplateController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', messageTemplateController.getMessageTemplates);
router.post('/', messageTemplateController.createMessageTemplate);
router.put('/:id', messageTemplateController.updateMessageTemplate);
router.delete('/:id', messageTemplateController.deleteMessageTemplate);

module.exports = router;
