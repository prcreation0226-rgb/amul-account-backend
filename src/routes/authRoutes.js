const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/impersonate', verifyToken, requireRole(['SUPERADMIN']), authController.impersonate);
router.get('/me', verifyToken, authController.getMe);
router.put('/me', verifyToken, authController.updateMe);
router.put('/change-password', verifyToken, authController.changePassword);
router.post('/register-sub-user', verifyToken, authController.registerSubUser);

module.exports = router;
