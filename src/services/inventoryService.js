const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Handles stock updates for all inventory transaction types based on Business Rules.
 * @param {Array} items - Array of InvoiceItem objects { productId, quantity }
 * @param {String} transactionType - TransactionType enum
 * @param {Number} warehouseId - The warehouse where the transaction is happening
 * @param {Number} toWarehouseId - Destination warehouse (only for STOCK_TRANSFER)
 * @param {Object} tx - Prisma transaction client
 */
const updateStock = async (items, transactionType, warehouseId, toWarehouseId, tx = prisma) => {
  // If the transaction doesn't affect stock, return early.
  if (['PURCHASE_ORDER', 'QUOTATION', 'CHALLAN'].includes(transactionType)) {
    return;
  }

  for (const item of items) {
    const qty = parseInt(item.quantity) + parseInt(item.freeQty || 0);

    // Determine the operation based on transaction type
    let stockChange = 0;

    switch (transactionType) {
      case 'PURCHASE':
      case 'SALES_RETURN':
        stockChange = qty; // Increase stock
        break;
      case 'SALES':
      case 'PURCHASE_RETURN':
        stockChange = -qty; // Decrease stock
        break;
      case 'ADJUSTMENT':
        // For simple adjustments, we will assume it's absolute replacement or delta.
        // If we treat it as delta, it can be positive or negative. For this basic setup:
        stockChange = qty; 
        break;
      default:
        break;
    }

    const productRecord = await tx.product.findUnique({
      where: { id: item.productId },
      select: { companyId: true }
    });
    if (!productRecord) continue;
    const companyId = productRecord.companyId;

    // Apply standard stock change
    if (stockChange !== 0 && transactionType !== 'STOCK_TRANSFER') {
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: stockChange } }
      });

      // Low stock validation check
      if (stockChange < 0 && product.stock < 0) {
        // Here we could throw an error if "negativeStockLock" setting is true.
      }

      // Update warehouse stock
      let targetWhId = warehouseId ? parseInt(warehouseId, 10) : null;
      if (!targetWhId) {
        const wh = await tx.warehouse.findFirst({
          where: { companyId }
        });
        if (wh) targetWhId = wh.id;
      }

      if (targetWhId) {
        await tx.warehouseStock.upsert({
          where: { productId_warehouseId: { productId: item.productId, warehouseId: targetWhId } },
          create: {
            productId: item.productId,
            warehouseId: targetWhId,
            stock: stockChange,
            companyId
          },
          update: {
            stock: { increment: stockChange }
          }
        });
      }
    }

    // Handle Stock Transfer explicitly
    if (transactionType === 'STOCK_TRANSFER') {
      const srcWhId = warehouseId ? parseInt(warehouseId, 10) : null;
      const destWhId = toWarehouseId ? parseInt(toWarehouseId, 10) : null;

      if (srcWhId) {
        await tx.warehouseStock.upsert({
          where: { productId_warehouseId: { productId: item.productId, warehouseId: srcWhId } },
          create: {
            productId: item.productId,
            warehouseId: srcWhId,
            stock: -qty,
            companyId
          },
          update: {
            stock: { decrement: qty }
          }
        });
      }

      if (destWhId) {
        await tx.warehouseStock.upsert({
          where: { productId_warehouseId: { productId: item.productId, warehouseId: destWhId } },
          create: {
            productId: item.productId,
            warehouseId: destWhId,
            stock: qty,
            companyId
          },
          update: {
            stock: { increment: qty }
          }
        });
      }
    }
  }
};

module.exports = {
  updateStock
};
