const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Protect all offer routes
router.use(verifyToken);

// Offer routes
router.post('/', offerController.createOffer);
router.get('/', offerController.getOffers);
router.put('/:id', offerController.updateOffer);
router.patch('/:id/toggle-status', offerController.toggleOfferStatus);
router.delete('/:id', offerController.deleteOffer);

module.exports = router;
