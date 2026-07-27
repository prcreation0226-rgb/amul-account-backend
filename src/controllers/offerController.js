const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new offer
exports.createOffer = async (req, res) => {
  try {
    const {
      name,
      offerType,
      productSelection,
      discountType,
      discountValue,
      buyQty,
      getQty,
      startDate,
      endDate,
      schedule,
      offerDescription,
      status,
      minCart,
      target,
      type,
      offerValue,
      scheduleIcon,
      priority,
      usage
    } = req.body;

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Company ID is required' });
    }

    const offer = await prisma.offer.create({
      data: {
        name,
        offerType,
        productSelection,
        discountType,
        discountValue: discountValue ? String(discountValue) : null,
        buyQty: buyQty ? parseInt(buyQty) : null,
        getQty: getQty ? parseInt(getQty) : null,
        startDate,
        endDate,
        schedule,
        offerDescription,
        status: status || 'ACTIVE',
        minCart: minCart || '-',
        target,
        type,
        offerValue,
        scheduleIcon,
        priority: priority || 'P3',
        usage: usage || 0,
        companyId
      }
    });

    res.status(201).json({ message: 'Offer created successfully', data: offer });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get all offers for a company
exports.getOffers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Company ID is required' });
    }

    const offers = await prisma.offer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ message: 'Offers retrieved successfully', data: offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Delete an offer
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Company ID is required' });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.companyId !== companyId) {
      return res.status(403).json({ message: 'Unauthorized to delete this offer' });
    }

    await prisma.offer.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Update an offer
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const offer = await prisma.offer.findUnique({ where: { id: parseInt(id) } });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    if (offer.companyId !== companyId) return res.status(403).json({ message: 'Unauthorized' });

    const updated = await prisma.offer.update({
      where: { id: parseInt(id) },
      data: req.body
    });
    res.status(200).json({ message: 'Offer updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Toggle offer status ACTIVE <-> INACTIVE
exports.toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const offer = await prisma.offer.findUnique({ where: { id: parseInt(id) } });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    if (offer.companyId !== companyId) return res.status(403).json({ message: 'Unauthorized' });

    const newStatus = offer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.offer.update({
      where: { id: parseInt(id) },
      data: { status: newStatus }
    });
    res.status(200).json({ message: 'Status toggled', data: updated });
  } catch (error) {
    console.error('Error toggling status:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

