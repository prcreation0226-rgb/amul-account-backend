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
    let pQty = 0;
    let sQty = 0;

    if (item.primaryOpeningQty !== undefined || item.secOpeningQty !== undefined) {
       pQty = (parseFloat(item.primaryOpeningQty) || 0) + parseInt(item.freeQty || 0);
       sQty = (parseFloat(item.secOpeningQty) || 0);
    } else {
       pQty = parseInt(item.quantity) + parseInt(item.freeQty || 0);
    }

    // Determine the operation based on transaction type
    let stockChange = 0;
    let secStockChange = 0;

    switch (transactionType) {
      case 'PURCHASE':
      case 'SALES_RETURN':
        stockChange = pQty; // Increase stock
        secStockChange = sQty;
        break;
      case 'SALES':
      case 'PURCHASE_RETURN':
        stockChange = -pQty; // Decrease stock
        secStockChange = -sQty;
        break;
      case 'ADJUSTMENT':
        stockChange = pQty; 
        secStockChange = sQty;
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
    if ((stockChange !== 0 || secStockChange !== 0) && transactionType !== 'STOCK_TRANSFER') {
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { 
          stock: { increment: Math.round(stockChange) },
          secOpeningQty: { increment: secStockChange }
        }
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
            stock: Math.round(stockChange),
            companyId
          },
          update: {
            stock: { increment: Math.round(stockChange) }
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
            stock: -Math.round(pQty),
            companyId
          },
          update: {
            stock: { decrement: Math.round(pQty) }
          }
        });
      }

      if (destWhId) {
        await tx.warehouseStock.upsert({
          where: { productId_warehouseId: { productId: item.productId, warehouseId: destWhId } },
          create: {
            productId: item.productId,
            warehouseId: destWhId,
            stock: Math.round(pQty),
            companyId
          },
          update: {
            stock: { increment: Math.round(pQty) }
          }
        });
      }
    }
  }
};

module.exports = {
  updateStock
};
