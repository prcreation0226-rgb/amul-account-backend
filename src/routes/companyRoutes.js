const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Routes for the current user's company (allowed for normal users)
router.get('/me', verifyToken, companyController.getMeCompany);
router.put('/me', verifyToken, companyController.updateMeCompany);

// Superadmin only routes
router.use(verifyToken, requireRole(['SUPERADMIN']));

router.get('/', companyController.getAllCompanies);
router.post('/', companyController.createCompany);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);
router.patch('/:id/status', companyController.updateStatus);

module.exports = router;
