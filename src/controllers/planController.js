const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all subscription plans (global, not tenant-specific)
exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { companies: true }
        }
      }
    });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new subscription plan
exports.createPlan = async (req, res) => {
  const { name, price, features } = req.body;
  try {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        price: parseFloat(price) || 0,
        features: features || {}
      }
    });
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update an existing subscription plan
exports.updatePlan = async (req, res) => {
  const { id } = req.params;
  const { name, price, features } = req.body;
  try {
    const plan = await prisma.subscriptionPlan.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(features && { features })
      }
    });
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a subscription plan
exports.deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    // Optionally check if companies are using it, though prisma may throw a constraint error or cascade
    await prisma.subscriptionPlan.delete({
      where: { id: parseInt(id, 10) }
    });
    res.status(200).json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error. Plan might be in use.' });
  }
};

// Upgrade a company's subscription plan
exports.upgradeSubscription = async (req, res) => {
  const companyId = req.user.companyId;
  const { planId } = req.body;
  try {
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { planId: parseInt(planId, 10) }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
