const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all products for the tenant
exports.getProducts = async (req, res) => {
  const companyId = req.user.companyId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 100000;
  const skip = (page - 1) * limit;
  const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId, 10) : null;
  try {
    const [products, total, unitConversions, warehouseStocks] = await Promise.all([
      prisma.product.findMany({ 
        where: { companyId, deletedAt: null }, 
        include: { attributeValues: true },
        skip, 
        take: limit 
      }),
      prisma.product.count({ where: { companyId, deletedAt: null } }),
      prisma.unitConversion.findMany({ where: { companyId } }),
      warehouseId ? prisma.warehouseStock.findMany({ where: { warehouseId, companyId } }) : []
    ]);

    let queriedWarehouseName = null;
    if (warehouseId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: warehouseId }
      });
      if (wh) queriedWarehouseName = wh.name;
    }

    const enrichedProducts = products.map(product => {
      let currentStock = product.stock;
      if (warehouseId) {
        const whStock = warehouseStocks.find(ws => ws.productId === product.id);
        if (whStock) {
          currentStock = whStock.stock;
        } else if (queriedWarehouseName && product.warehouse === queriedWarehouseName) {
          currentStock = product.stock;
        } else {
          currentStock = 0;
        }
      }
      
      const convertedProd = { ...product, stock: currentStock };

      if (convertedProd.baseUnit && convertedProd.salesUnit) {
        const conversion = unitConversions.find(c => 
          c.baseUnit.toLowerCase() === convertedProd.baseUnit.toLowerCase() && 
          c.targetUnit.toLowerCase() === convertedProd.salesUnit.toLowerCase()
        );
        if (conversion && conversion.baseQty > 0) {
           return { ...convertedProd, conversionRate: conversion.targetQty / conversion.baseQty };
        }
      }
      return convertedProd;
    });

    res.status(200).json({ success: true, data: enrichedProducts, meta: { total, page, limit } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new product for the tenant
exports.createProduct = async (req, res) => {
  const companyId = req.user.companyId;
  const { 
    name, sku, price, stock, mrp, barcode, category, brand, colorVariant, status,
    tax, hsnCode, purchasePrice, wholesalePrice, creditSalePrice, baseUnit, purchaseUnit, salesUnit,
    lowStockAlert, reorderLevel, enableBatch, enableExpiry, enableImei, hasBom, qtySlabs,
    openingStockRate, secOpeningQty, asOfDate, warehouse, bomName, isMultiLevel, bomRecipe,
    syncOnline, onlineProductName, onlineProductDesc, onlineSalePrice, ecommerceCategory, productImage,
    commissionType, size, colour, expiryMonth, location, hindiName, description, termsCondition, productTags,
    rawMaterials, extraCharges, subItems, subInventory,
    attributeValues
  } = req.body;
  
  let finalSku = (sku && sku.trim() !== '') ? sku.trim() : 'SKU-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);

  try {
    const product = await prisma.product.create({
      data: { 
        name, 
        sku: finalSku, 
        barcode,
        price: parseFloat(price) || 0, 
        mrp: parseFloat(mrp) || 0,
        category,
        brand,
        colorVariant,
        status: status || 'Active',
        stock: parseInt(stock, 10) || 0, 
        tax: parseFloat(tax) || 0,
        hsnCode,
        purchasePrice: parseFloat(purchasePrice) || 0,
        wholesalePrice: parseFloat(wholesalePrice) || 0,
        creditSalePrice: parseFloat(creditSalePrice) || 0,
        baseUnit,
        purchaseUnit,
        salesUnit,
        lowStockAlert: parseInt(lowStockAlert, 10) || 0,
        reorderLevel: parseInt(reorderLevel, 10) || 0,
        enableBatch: Boolean(enableBatch),
        enableExpiry: Boolean(enableExpiry),
        enableImei: Boolean(enableImei),
        hasBom: Boolean(hasBom),
        qtySlabs: qtySlabs ? qtySlabs : undefined,
        openingStockRate: parseFloat(openingStockRate) || 0,
        secOpeningQty: parseFloat(secOpeningQty) || 0,
        asOfDate,
        warehouse,
        bomName,
        isMultiLevel: Boolean(isMultiLevel),
        bomRecipe: bomRecipe ? bomRecipe : undefined,
        syncOnline: Boolean(syncOnline),
        onlineProductName,
        onlineProductDesc,
        onlineSalePrice: parseFloat(onlineSalePrice) || 0,
        ecommerceCategory,
        productImage,
        commissionType,
        size,
        colour,
        expiryMonth,
        location,
        hindiName,
        description,
        termsCondition,
        productTags,
        rawMaterials,
        extraCharges,
        subItems,
        subInventory,
        companyId,
        ...(attributeValues && {
          attributeValues: {
            create: attributeValues.map(attr => ({
              attributeId: parseInt(attr.attributeId, 10),
              value: attr.value
            }))
          }
        })
      }
    });

    let targetWhId = null;
    if (warehouse && warehouse.trim() !== '') {
      const wh = await prisma.warehouse.findFirst({
        where: { companyId, name: warehouse.trim() }
      });
      if (wh) targetWhId = wh.id;
    }
    if (!targetWhId) {
      const firstWh = await prisma.warehouse.findFirst({
        where: { companyId }
      });
      if (firstWh) targetWhId = firstWh.id;
    }

    if (targetWhId) {
      await prisma.warehouseStock.upsert({
        where: { productId_warehouseId: { productId: product.id, warehouseId: targetWhId } },
        create: {
          productId: product.id,
          warehouseId: targetWhId,
          stock: parseInt(stock, 10) || 0,
          companyId
        },
        update: {
          stock: parseInt(stock, 10) || 0
        }
      });
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'SKU already exists for this company' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a product (e.g., stock adjustments)
exports.updateProduct = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { 
    name, sku, price, stock, mrp, barcode, category, brand, colorVariant, status,
    tax, hsnCode, purchasePrice, wholesalePrice, creditSalePrice, baseUnit, purchaseUnit, salesUnit,
    lowStockAlert, reorderLevel, enableBatch, enableExpiry, enableImei, hasBom, qtySlabs,
    openingStockRate, secOpeningQty, asOfDate, warehouse, bomName, isMultiLevel, bomRecipe,
    syncOnline, onlineProductName, onlineProductDesc, onlineSalePrice, ecommerceCategory, productImage,
    commissionType, size, colour, expiryMonth, location, hindiName, description, termsCondition, productTags,
    rawMaterials, extraCharges, subItems, subInventory,
    attributeValues
  } = req.body;
  try {
    const existing = await prisma.product.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(category !== undefined && { category }),
        ...(brand !== undefined && { brand }),
        ...(colorVariant !== undefined && { colorVariant }),
        ...(status && { status }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(mrp !== undefined && { mrp: parseFloat(mrp) }),
        ...(stock !== undefined && { stock: parseInt(stock, 10) }),
        ...(tax !== undefined && { tax: parseFloat(tax) }),
        ...(hsnCode !== undefined && { hsnCode }),
        ...(purchasePrice !== undefined && { purchasePrice: parseFloat(purchasePrice) }),
        ...(wholesalePrice !== undefined && { wholesalePrice: parseFloat(wholesalePrice) }),
        ...(creditSalePrice !== undefined && { creditSalePrice: parseFloat(creditSalePrice) }),
        ...(baseUnit !== undefined && { baseUnit }),
        ...(purchaseUnit !== undefined && { purchaseUnit }),
        ...(salesUnit !== undefined && { salesUnit }),
        ...(lowStockAlert !== undefined && { lowStockAlert: parseInt(lowStockAlert, 10) }),
        ...(reorderLevel !== undefined && { reorderLevel: parseInt(reorderLevel, 10) }),
        ...(enableBatch !== undefined && { enableBatch: Boolean(enableBatch) }),
        ...(enableExpiry !== undefined && { enableExpiry: Boolean(enableExpiry) }),
        ...(enableImei !== undefined && { enableImei: Boolean(enableImei) }),
        ...(hasBom !== undefined && { hasBom: Boolean(hasBom) }),
        ...(qtySlabs !== undefined && { qtySlabs }),
        ...(openingStockRate !== undefined && { openingStockRate: parseFloat(openingStockRate) }),
        ...(secOpeningQty !== undefined && { secOpeningQty: parseFloat(secOpeningQty) }),
        ...(asOfDate !== undefined && { asOfDate }),
        ...(warehouse !== undefined && { warehouse }),
        ...(bomName !== undefined && { bomName }),
        ...(isMultiLevel !== undefined && { isMultiLevel: Boolean(isMultiLevel) }),
        ...(bomRecipe !== undefined && { bomRecipe }),
        ...(syncOnline !== undefined && { syncOnline: Boolean(syncOnline) }),
        ...(onlineProductName !== undefined && { onlineProductName }),
        ...(onlineProductDesc !== undefined && { onlineProductDesc }),
        ...(onlineSalePrice !== undefined && { onlineSalePrice: parseFloat(onlineSalePrice) }),
        ...(ecommerceCategory !== undefined && { ecommerceCategory }),
        ...(productImage !== undefined && { productImage }),
        ...(commissionType !== undefined && { commissionType }),
        ...(size !== undefined && { size }),
        ...(colour !== undefined && { colour }),
        ...(expiryMonth !== undefined && { expiryMonth }),
        ...(location !== undefined && { location }),
        ...(hindiName !== undefined && { hindiName }),
        ...(description !== undefined && { description }),
        ...(termsCondition !== undefined && { termsCondition }),
        ...(productTags !== undefined && { productTags }),
        ...(rawMaterials !== undefined && { rawMaterials }),
        ...(extraCharges !== undefined && { extraCharges }),
        ...(subItems !== undefined && { subItems }),
        ...(subInventory !== undefined && { subInventory })
      }
    });

    if (attributeValues) {
      await prisma.productAttributeValue.deleteMany({
        where: { productId: product.id }
      });
      if (attributeValues.length > 0) {
        await prisma.productAttributeValue.createMany({
          data: attributeValues.map(attr => ({
            productId: product.id,
            attributeId: parseInt(attr.attributeId, 10),
            value: attr.value
          }))
        });
      }
    }
    if (stock !== undefined || warehouse !== undefined) {
      const targetWhName = warehouse !== undefined ? warehouse : product.warehouse;
      const targetStock = stock !== undefined ? parseInt(stock, 10) : product.stock;

      let targetWhId = null;
      if (targetWhName && targetWhName.trim() !== '') {
        const wh = await prisma.warehouse.findFirst({
          where: { companyId, name: targetWhName.trim() }
        });
        if (wh) targetWhId = wh.id;
      }
      if (!targetWhId) {
        const firstWh = await prisma.warehouse.findFirst({
          where: { companyId }
        });
        if (firstWh) targetWhId = firstWh.id;
      }

      if (targetWhId) {
        await prisma.warehouseStock.upsert({
          where: { productId_warehouseId: { productId: product.id, warehouseId: targetWhId } },
          create: {
            productId: product.id,
            warehouseId: targetWhId,
            stock: targetStock || 0,
            companyId
          },
          update: {
            stock: targetStock || 0
          }
        });
      }
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const productId = parseInt(id, 10);
  try {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if this product is used in any invoice
    const invoiceItemCount = await prisma.invoiceItem.count({ where: { productId } });

    if (invoiceItemCount > 0) {
      // Soft-delete: mark as Deleted so invoice history is preserved
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'Deleted', deletedAt: new Date() }
      });
      return res.status(200).json({ success: true, message: 'Product marked as deleted (used in invoices)' });
    }

    // Hard-delete: no invoice references, safe to remove completely
    await prisma.$transaction([
      prisma.bomItem.deleteMany({ where: { productId } }),
      prisma.productAttributeValue.deleteMany({ where: { productId } }),
      prisma.stockAdjustmentLog.deleteMany({ where: { productId } }),
      prisma.product.delete({ where: { id: productId } })
    ]);

    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Merge two products
exports.mergeProducts = async (req, res) => {
  const companyId = req.user.companyId;
  const { incorrectProductId, correctProductId } = req.body;

  if (!incorrectProductId || !correctProductId) {
    return res.status(400).json({ success: false, message: 'Missing product IDs' });
  }
  
  if (incorrectProductId === correctProductId) {
    return res.status(400).json({ success: false, message: 'Cannot merge a product into itself' });
  }

  try {
    const incorrect = await prisma.product.findFirst({ where: { id: parseInt(incorrectProductId, 10), companyId } });
    const correct = await prisma.product.findFirst({ where: { id: parseInt(correctProductId, 10), companyId } });

    if (!incorrect || !correct) {
      return res.status(404).json({ success: false, message: 'One or both products not found' });
    }

    // Run within a transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // 1. Update Invoice items
      await tx.invoiceItem.updateMany({
        where: { productId: incorrect.id },
        data: { productId: correct.id }
      });

      // 2. Update Bom items
      await tx.bomItem.updateMany({
        where: { productId: incorrect.id },
        data: { productId: correct.id }
      });

      // 3. Add stock from incorrect to correct
      await tx.product.update({
        where: { id: correct.id },
        data: {
          stock: correct.stock + incorrect.stock
        }
      });

      // 4. Delete incorrect product
      await tx.product.delete({
        where: { id: incorrect.id }
      });
    });

    res.status(200).json({ success: true, message: 'Products merged successfully' });
  } catch (error) {
    console.error('Merge Products Error:', error);
    res.status(500).json({ success: false, message: 'Server error during merge' });
  }
};

// Get Expiry Report
exports.getExpiryReport = async (req, res) => {
  const companyId = req.user.companyId;
  const { filter, startDate, endDate } = req.query;

  try {
    const products = await prisma.product.findMany({
      where: { 
        companyId,
        enableExpiry: true,
        expiryMonth: { not: null, not: "" }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        stock: true,
        expiryMonth: true
      }
    });

    // Parse dates and filter in-memory
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredProducts = products.filter(p => {
      // expiryMonth format: DD/MM/YYYY
      const parts = p.expiryMonth.split('/');
      if (parts.length !== 3) return false;
      const expDate = new Date(parts[2], parts[1] - 1, parts[0]);
      expDate.setHours(0, 0, 0, 0);

      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch(filter) {
        case 'Expired Already':
          return diffDays < 0;
        case 'Next 7 Days':
          return diffDays >= 0 && diffDays <= 7;
        case 'Next 15 Days':
          return diffDays >= 0 && diffDays <= 15;
        case 'Next 30 Days':
          return diffDays >= 0 && diffDays <= 30;
        case 'Next 3 Months':
          return diffDays >= 0 && diffDays <= 90;
        case 'Next 6 Months':
          return diffDays >= 0 && diffDays <= 180;
        case 'Custom Date Range':
          if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0,0,0,0);
            const end = new Date(endDate);
            end.setHours(23,59,59,999);
            return expDate >= start && expDate <= end;
          }
          return true;
        default:
          return true;
      }
    });

    // Sort by expiry date ascending
    filteredProducts.sort((a, b) => {
      const partsA = a.expiryMonth.split('/');
      const partsB = b.expiryMonth.split('/');
      const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
      const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
      return dateA - dateB;
    });

    res.status(200).json({ success: true, data: filteredProducts });
  } catch (error) {
    console.error("Expiry Report Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Stock Inventory Report
exports.getStockInventory = async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate, search, branchId, locationId, warehouseId } = req.query;

  try {
    // Fetch all warehouses for company to resolve relationships and apply filtering
    const warehouses = await prisma.warehouse.findMany({
      where: { companyId },
      include: {
        branch: true,
        locRef: true
      }
    });

    // Determine target warehouse names and IDs for filtering
    let targetWarehouseNames = null;
    let targetWarehouseIds = null;

    if (warehouseId) {
      const wh = warehouses.find(w => w.id === parseInt(warehouseId, 10));
      if (wh) {
        targetWarehouseNames = [wh.name];
        targetWarehouseIds = [wh.id];
      } else {
        // If warehouse filter is specified but not found
        targetWarehouseNames = [];
        targetWarehouseIds = [];
      }
    } else if (locationId) {
      const whs = warehouses.filter(w => w.locationId === parseInt(locationId, 10));
      targetWarehouseNames = whs.map(w => w.name);
      targetWarehouseIds = whs.map(w => w.id);
    } else if (branchId) {
      const whs = warehouses.filter(w => w.branchId === parseInt(branchId, 10));
      targetWarehouseNames = whs.map(w => w.name);
      targetWarehouseIds = whs.map(w => w.id);
    }

    // Build date filter for invoices
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { gte: start, lte: end } };
    }

    const warehouseStocks = await prisma.warehouseStock.findMany({
      where: { companyId }
    });

    // Search filter for products
    let productWhere = { companyId, deletedAt: null };
    if (search && search.trim() !== '') {
      productWhere.name = { contains: search.trim() };
    }
    
    // Filter products by warehouses if a filter is active
    if (targetWarehouseNames !== null) {
      const matchingProductIds = warehouseStocks
        .filter(ws => targetWarehouseIds.includes(ws.warehouseId))
        .map(ws => ws.productId);

      productWhere.OR = [
        { warehouse: { in: targetWarehouseNames } },
        { id: { in: matchingProductIds } }
      ];
    }

    // Get all products for this company
    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        stock: true,
        openingStockRate: true,
        warehouse: true,
        location: true,
      },
      orderBy: { name: 'asc' }
    });

    if (products.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const productIds = products.map(p => p.id);

    // Get purchase quantities from PURCHASE invoices within date range
    const purchaseItems = await prisma.invoiceItem.findMany({
      where: {
        productId: { in: productIds },
        invoice: {
          is: {
            companyId,
            type: 'PURCHASE',
            ...(targetWarehouseIds && { warehouseId: { in: targetWarehouseIds } }),
            ...dateFilter
          }
        }
      },
      select: {
        productId: true,
        quantity: true,
        freeQty: true,
      }
    });

    // Get sale quantities from SALES invoices within date range
    const saleItems = await prisma.invoiceItem.findMany({
      where: {
        productId: { in: productIds },
        invoice: {
          is: {
            companyId,
            type: 'SALES',
            ...(targetWarehouseIds && { warehouseId: { in: targetWarehouseIds } }),
            ...dateFilter
          }
        }
      },
      select: {
        productId: true,
        quantity: true,
        freeQty: true,
      }
    });

    // Get sale return quantities (these add back to stock)
    const saleReturnItems = await prisma.invoiceItem.findMany({
      where: {
        productId: { in: productIds },
        invoice: {
          is: {
            companyId,
            type: 'SALES_RETURN',
            ...(targetWarehouseIds && { warehouseId: { in: targetWarehouseIds } }),
            ...dateFilter
          }
        }
      },
      select: {
        productId: true,
        quantity: true,
      }
    });

    // Get purchase return quantities (these reduce purchase qty)
    const purchaseReturnItems = await prisma.invoiceItem.findMany({
      where: {
        productId: { in: productIds },
        invoice: {
          is: {
            companyId,
            type: 'PURCHASE_RETURN',
            ...(targetWarehouseIds && { warehouseId: { in: targetWarehouseIds } }),
            ...dateFilter
          }
        }
      },
      select: {
        productId: true,
        quantity: true,
      }
    });

    // Build maps for quick lookup
    const purchaseMap = {};
    purchaseItems.forEach(item => {
      purchaseMap[item.productId] = (purchaseMap[item.productId] || 0) + (item.quantity || 0) + (item.freeQty || 0);
    });

    const saleMap = {};
    saleItems.forEach(item => {
      saleMap[item.productId] = (saleMap[item.productId] || 0) + (item.quantity || 0);
    });

    const saleReturnMap = {};
    saleReturnItems.forEach(item => {
      saleReturnMap[item.productId] = (saleReturnMap[item.productId] || 0) + (item.quantity || 0);
    });

    const purchaseReturnMap = {};
    purchaseReturnItems.forEach(item => {
      purchaseReturnMap[item.productId] = (purchaseReturnMap[item.productId] || 0) + (item.quantity || 0);
    });

    const inventoryData = products.map(product => {
      const purchaseQty = (purchaseMap[product.id] || 0) - (purchaseReturnMap[product.id] || 0);
      const saleQty = (saleMap[product.id] || 0) - (saleReturnMap[product.id] || 0);

      let closingStock = product.stock;
      if (targetWarehouseIds && targetWarehouseIds.length > 0) {
        const whStocksForProduct = warehouseStocks.filter(ws => ws.productId === product.id && targetWarehouseIds.includes(ws.warehouseId));
        if (whStocksForProduct.length > 0) {
          closingStock = whStocksForProduct.reduce((sum, ws) => sum + ws.stock, 0);
        } else if (product.warehouse && targetWarehouseNames && targetWarehouseNames.includes(product.warehouse)) {
          closingStock = product.stock;
        } else {
          closingStock = 0;
        }
      }

      let openingStock = 0;

      if (startDate && endDate) {
        // Opening Stock = Closing Stock - Purchases + Sales (reverse calculation)
        openingStock = closingStock - purchaseQty + saleQty;
        closingStock = openingStock + purchaseQty - saleQty;
      } else {
        openingStock = closingStock - purchaseQty + saleQty;
      }

      // Resolve branch, location and warehouse names
      const matchedWarehouse = warehouses.find(w => w.name === product.warehouse);
      const branchName = matchedWarehouse?.branch?.name || 'No Branch';
      const locationName = matchedWarehouse?.locRef?.name || product.location || 'No Location';
      const warehouseName = product.warehouse || 'No Warehouse';

      return {
        id: product.id,
        name: product.name,
        branchName,
        locationName,
        warehouseName,
        openingStock,
        purchaseQty,
        saleQty,
        closingStock,
      };
    });

    res.status(200).json({ success: true, data: inventoryData });
  } catch (error) {
    console.error('Stock Inventory Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Order List
exports.getOrderList = async (req, res) => {
  const companyId = req.user.companyId;

  try {
    const products = await prisma.product.findMany({
      where: {
        companyId,
        lowStockAlert: {
          gt: 0
        }
      },
      select: {
        id: true,
        name: true,
        category: true,
        stock: true,
        lowStockAlert: true,
        reorderLevel: true,
        purchasePrice: true
      }
    });

    const orderList = products
      .filter(p => p.stock <= p.lowStockAlert)
      .map(p => {
        let quantity = Math.max(p.reorderLevel - p.stock, 1);
        if (p.reorderLevel <= 0) {
          quantity = p.lowStockAlert > 0 ? p.lowStockAlert : 1;
        }
        
        return {
          id: p.id,
          description: p.name,
          category: p.category || 'Uncategorized',
          quantity: quantity,
          price: p.purchasePrice || 0,
          amount: quantity * (p.purchasePrice || 0)
        };
      });

    res.status(200).json({ success: true, data: orderList });
  } catch (error) {
    console.error("Order List Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Bulk update HSN/GST
exports.bulkUpdateHsnGst = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, message: 'Invalid products array' });
    }

    const updatePromises = products.map(p => {
      // Clean GST string like "@18 %" to "18"
      const taxRate = p.gst ? parseFloat(p.gst.replace(/[^0-9.]/g, '')) : 0;
      return prisma.product.updateMany({
        where: { id: p.id, companyId },
        data: { hsnCode: p.hsn || null, tax: isNaN(taxRate) ? 0 : taxRate }
      });
    });

    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Products updated successfully' });
  } catch (error) {
    console.error('Bulk update error', error);
    res.status(500).json({ success: false, message: 'Failed to bulk update HSN/GST' });
  }
};

// Correct all product stocks based on invoices
exports.stockCorrection = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const products = await prisma.product.findMany({ where: { companyId }, select: { id: true, stock: true, openingStockRate: true } });
    const productIds = products.map(p => p.id);

    const purchaseItems = await prisma.invoiceItem.findMany({
      where: { productId: { in: productIds }, invoice: { is: { companyId, type: 'PURCHASE' } } },
      select: { productId: true, quantity: true, freeQty: true }
    });
    const saleItems = await prisma.invoiceItem.findMany({
      where: { productId: { in: productIds }, invoice: { is: { companyId, type: 'SALES' } } },
      select: { productId: true, quantity: true, freeQty: true }
    });
    const saleReturnItems = await prisma.invoiceItem.findMany({
      where: { productId: { in: productIds }, invoice: { is: { companyId, type: 'SALES_RETURN' } } },
      select: { productId: true, quantity: true }
    });
    const purchaseReturnItems = await prisma.invoiceItem.findMany({
      where: { productId: { in: productIds }, invoice: { is: { companyId, type: 'PURCHASE_RETURN' } } },
      select: { productId: true, quantity: true }
    });

    const pMap = {};
    purchaseItems.forEach(i => pMap[i.productId] = (pMap[i.productId]||0) + (i.quantity||0) + (i.freeQty||0));
    
    const sMap = {};
    saleItems.forEach(i => sMap[i.productId] = (sMap[i.productId]||0) + (i.quantity||0));
    
    const srMap = {};
    saleReturnItems.forEach(i => srMap[i.productId] = (srMap[i.productId]||0) + (i.quantity||0));
    
    const prMap = {};
    purchaseReturnItems.forEach(i => prMap[i.productId] = (prMap[i.productId]||0) + (i.quantity||0));

    // Rebuild warehouse stock map
    const whStockMap = {};
    const invoices = await prisma.invoice.findMany({
      where: { companyId },
      include: { items: true }
    });

    invoices.forEach(inv => {
      const srcWhId = inv.warehouseId;
      const destWhId = inv.toWarehouseId;

      inv.items.forEach(item => {
        const qty = (item.quantity || 0) + (item.freeQty || 0);

        if (inv.type === 'PURCHASE' || inv.type === 'SALES_RETURN') {
          if (srcWhId) {
            const key = `${item.productId}_${srcWhId}`;
            whStockMap[key] = (whStockMap[key] || 0) + qty;
          }
        } else if (inv.type === 'SALES' || inv.type === 'PURCHASE_RETURN') {
          if (srcWhId) {
            const key = `${item.productId}_${srcWhId}`;
            whStockMap[key] = (whStockMap[key] || 0) - qty;
          }
        } else if (inv.type === 'STOCK_TRANSFER') {
          if (srcWhId) {
            const key = `${item.productId}_${srcWhId}`;
            whStockMap[key] = (whStockMap[key] || 0) - qty;
          }
          if (destWhId) {
            const key = `${item.productId}_${destWhId}`;
            whStockMap[key] = (whStockMap[key] || 0) + qty;
          }
        }
      });
    });

    // Run updates in a transaction for safety
    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const pQty = pMap[product.id] || 0;
        const sQty = sMap[product.id] || 0;
        const srQty = srMap[product.id] || 0;
        const prQty = prMap[product.id] || 0;
        
        const newStock = pQty - sQty + srQty - prQty;
        
        await tx.product.update({
          where: { id: product.id },
          data: { stock: newStock }
        });
      }

      // Delete existing warehouse stock records
      await tx.warehouseStock.deleteMany({ where: { companyId } });

      // Create new warehouse stock records
      for (const key of Object.keys(whStockMap)) {
        const [prodIdStr, whIdStr] = key.split('_');
        const productId = parseInt(prodIdStr, 10);
        const warehouseId = parseInt(whIdStr, 10);
        const stock = whStockMap[key];

        await tx.warehouseStock.create({
          data: {
            productId,
            warehouseId,
            stock,
            companyId
          }
        });
      }
    });

    res.status(200).json({ success: true, message: 'Stock and warehouse stock corrected successfully for all products.' });
  } catch (error) {
    console.error('Stock Correction Error:', error);
    res.status(500).json({ success: false, message: 'Server error during stock correction' });
  }
};

// Bulk update product prices
exports.bulkUpdatePrices = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, message: 'Invalid products array' });
    }

    const updatePromises = products.map(p => {
      const data = {};
      if (p.purchasePrice !== undefined) data.purchasePrice = parseFloat(p.purchasePrice) || 0;
      if (p.mrp !== undefined) data.mrp = parseFloat(p.mrp) || 0;
      if (p.creditSale !== undefined) data.creditSalePrice = parseFloat(p.creditSale) || 0;
      if (p.cashSale !== undefined) data.price = parseFloat(p.cashSale) || 0;
      if (p.wholeSale !== undefined) data.wholesalePrice = parseFloat(p.wholeSale) || 0;
      if (p.hsn !== undefined) data.hsnCode = p.hsn === '+Add' ? null : p.hsn;

      return prisma.product.updateMany({
        where: { id: parseInt(p.id, 10), companyId },
        data
      });
    });

    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Product prices updated successfully' });
  } catch (error) {
    console.error('Bulk update prices error', error);
    res.status(500).json({ success: false, message: 'Failed to bulk update prices' });
  }
};

// Get Item Quantity Report for a specific product
exports.getItemQuantityReport = async (req, res) => {
  const companyId = req.user.companyId;
  const productId = parseInt(req.params.id, 10);
  try {
    const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { productId, invoice: { companyId } },
      include: { invoice: { include: { customer: true } } },
      orderBy: { invoice: { date: 'asc' } }
    });

    let runningStock = 0;
    const transactions = invoiceItems.map(item => {
      const inv = item.invoice;
      const partyName = inv.customer?.name || 'Cash';
      const type = inv.type; // PURCHASE, SALES, etc.
      
      let qtyIn = 0;
      let qtyOut = 0;
      const qty = (item.quantity || 0) + (item.freeQty || 0);

      if (type === 'PURCHASE' || type === 'SALES_RETURN') {
        qtyIn = qty;
        runningStock += qty;
      } else if (type === 'SALES' || type === 'PURCHASE_RETURN') {
        qtyOut = qty;
        runningStock -= qty;
      }

      return {
        id: item.id,
        invoiceId: inv.id,
        date: inv.date,
        partyName,
        type,
        productName: product.name,
        qtyIn,
        qtyOut,
        price: item.price,
        total: item.amount,
        runningStock
      };
    });

    res.status(200).json({ success: true, product, transactions, openingStock: 0 });
  } catch (error) {
    console.error('Error fetching item quantity report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
