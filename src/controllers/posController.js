const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to generate a simple invoice number
const generateInvoiceNo = () => {
  const now = new Date();
  return `POS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime()}`;
};

exports.validateCart = async (req, res) => {
  const companyId = req.user.companyId;
  const { productId, qty } = req.body;

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId, 10) },
      select: { id: true, stock: true, companyId: true, name: true, price: true }
    });

    if (!product || product.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const settings = await prisma.companySetting.findUnique({
      where: { companyId }
    });

    if (settings && settings.negativeStockLock) {
      if (product.stock < qty) {
        return res.status(409).json({ 
          success: false, 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }
    }

    res.status(200).json({ success: true, data: { valid: true, product } });
  } catch (error) {
    console.error('validateCart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getQuickItems = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const products = await prisma.product.findMany({
      where: { companyId, status: 'Active' },
      take: 20,
      orderBy: { updatedAt: 'desc' }
    });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('getQuickItems error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.checkout = async (req, res) => {
  const companyId = req.user.companyId;
  const { customerId, items, paymentModes, totalAmount, loyaltyPointsUsed, redeemedPoints, loyaltyDiscountValue, offerId } = req.body;
  const pointsToRedeem = parseInt(redeemedPoints, 10) || parseInt(loyaltyPointsUsed, 10) || 0;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Format payment modes to string
      let paymentModeStr = 'Cash';
      if (Array.isArray(paymentModes) && paymentModes.length > 0) {
        paymentModeStr = paymentModes.map(pm => `${pm.mode}:${pm.amount}`).join(',');
      }

      let earnedPoints = 0;

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: parseInt(item.productId, 10) },
          select: { id: true, stock: true, companyId: true, creditSalePrice: true }
        });
        if (!product || product.companyId !== companyId) {
          throw new Error(`Product ${item.productId} not found`);
        }
        
        if (product.creditSalePrice && product.creditSalePrice > 0) {
          earnedPoints += Math.floor(product.creditSalePrice * (parseInt(item.qty || item.quantity) || 0));
        }

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: parseInt(item.qty || item.quantity) } }
        });

        // Decrement warehouse stock
        let targetWhId = null;
        const wh = await tx.warehouse.findFirst({
          where: { companyId }
        });
        if (wh) targetWhId = wh.id;

        if (targetWhId) {
          await tx.warehouseStock.upsert({
            where: { productId_warehouseId: { productId: product.id, warehouseId: targetWhId } },
            create: {
              productId: product.id,
              warehouseId: targetWhId,
              stock: -(parseInt(item.qty || item.quantity) || 0),
              companyId
            },
            update: {
              stock: { decrement: parseInt(item.qty || item.quantity) || 0 }
            }
          });
        }
      }

      if (customerId) {
        const netPoints = earnedPoints - pointsToRedeem;
        if (netPoints !== 0) {
          await tx.customer.update({
            where: { id: parseInt(customerId, 10) },
            data: { loyaltyPoints: { increment: netPoints } }
          });
        }
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: generateInvoiceNo(),
          date: new Date(),
          type: 'SALES',
          totalAmount: parseFloat(totalAmount) || 0,
          totalDiscount: parseFloat(loyaltyDiscountValue) || 0,
          paymentMode: paymentModeStr,
          companyId,
          customerId: customerId ? parseInt(customerId, 10) : null,
          items: {
            create: items.map(item => ({
              productId: parseInt(item.productId, 10),
              quantity: parseInt(item.qty || item.quantity) || 0,
              price: parseFloat(item.price) || 0,
              discount1: parseFloat(item.discount1) || 0,
              amount: parseFloat(item.amount) || 0
            }))
          }
        },
        include: { items: true }
      });

      if (offerId) {
        await tx.offer.update({
          where: { id: parseInt(offerId, 10) },
          data: { usage: { increment: 1 } }
        });
      }

        // --- Auto-deposit POS Sale into Bank Ledger ---
        let totalCredit = 0;
        if (invoice.type === 'SALES' && invoice.totalAmount > 0) {
          const { updateBankBalance } = require('../services/bankService');
          if (Array.isArray(paymentModes) && paymentModes.length > 0) {
             for (const pm of paymentModes) {
               const amt = parseFloat(pm.amount) || 0;
               if (amt > 0 && pm.mode) {
                 if (pm.mode.toLowerCase() === 'credit') {
                   totalCredit += amt;
                 } else {
                   await updateBankBalance(companyId, pm.mode, amt, 'IN', tx, `${pm.mode} POS Sale - ${invoice.invoiceNo}`);
                 }
               }
             }
          }
        }
        
        if (totalCredit > 0 && customerId) {
          await tx.customer.update({
            where: { id: parseInt(customerId, 10) },
            data: { balance: { increment: totalCredit } }
          });
        }
        // ---------------------------------------------------------

      await tx.auditLog.create({
        data: {
          actionType: 'POS_CHECKOUT',
          details: JSON.stringify({ invoiceNo: invoice.invoiceNo, totalAmount }),
          userName: req.user.email || 'POS_USER',
          companyId,
        },
      });

      return invoice;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('checkout error:', error);
    res.status(400).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.processReturns = async (req, res) => {
  const companyId = req.user.companyId;
  const { originalInvoiceId, returnItems, refundMode } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const originalInvoice = await tx.invoice.findUnique({
        where: { id: parseInt(originalInvoiceId, 10) }
      });

      if (!originalInvoice || originalInvoice.companyId !== companyId) {
        throw new Error('Original invoice not found');
      }

      let totalRefund = 0;
      for (const item of returnItems) {
        await tx.product.update({
          where: { id: parseInt(item.productId, 10) },
          data: { stock: { increment: parseInt(item.qty || item.quantity) } }
        });
        totalRefund += parseFloat(item.refundAmount) || 0;
      }

      const returnInvoice = await tx.invoice.create({
        data: {
          invoiceNo: `RET-${generateInvoiceNo()}`,
          date: new Date(),
          type: 'SALES_RETURN',
          totalAmount: totalRefund,
          paymentMode: refundMode || 'Bank',
          companyId,
          customerId: originalInvoice.customerId,
          items: {
            create: returnItems.map(item => ({
              productId: parseInt(item.productId, 10),
              quantity: parseInt(item.qty || item.quantity) || 0,
              amount: parseFloat(item.refundAmount) || 0
            }))
          }
        }
      });

      return returnInvoice;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('processReturns error:', error);
    res.status(400).json({ success: false, message: error.message || 'Server error' });
  }
};
