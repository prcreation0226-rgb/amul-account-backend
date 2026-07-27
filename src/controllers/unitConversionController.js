const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createConversion = async (req, res) => {
  try {
    const { baseUnit, baseQty, targetUnit, targetQty, isActive } = req.body;
    const companyId = req.user.companyId;

    if (!baseUnit || !targetUnit || !baseQty || !targetQty) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const conversion = await prisma.unitConversion.create({
      data: {
        baseUnit,
        baseQty: parseFloat(baseQty),
        targetUnit,
        targetQty: parseFloat(targetQty),
        isActive: isActive !== undefined ? isActive : true,
        companyId
      }
    });

    res.status(201).json({ success: true, message: 'Conversion created successfully', data: conversion });
  } catch (error) {
    console.error('Create Conversion Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getConversions = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const conversions = await prisma.unitConversion.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: conversions });
  } catch (error) {
    console.error('Get Conversions Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateConversion = async (req, res) => {
  try {
    const { id } = req.params;
    const { baseUnit, baseQty, targetUnit, targetQty, isActive } = req.body;
    const companyId = req.user.companyId;

    const existingConversion = await prisma.unitConversion.findFirst({
      where: { id: parseInt(id), companyId }
    });

    if (!existingConversion) {
      return res.status(404).json({ success: false, message: 'Conversion not found' });
    }

    const updatedConversion = await prisma.unitConversion.update({
      where: { id: parseInt(id) },
      data: {
        baseUnit: baseUnit || existingConversion.baseUnit,
        baseQty: baseQty ? parseFloat(baseQty) : existingConversion.baseQty,
        targetUnit: targetUnit || existingConversion.targetUnit,
        targetQty: targetQty ? parseFloat(targetQty) : existingConversion.targetQty,
        isActive: isActive !== undefined ? isActive : existingConversion.isActive
      }
    });

    res.status(200).json({ success: true, message: 'Conversion updated successfully', data: updatedConversion });
  } catch (error) {
    console.error('Update Conversion Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteConversion = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const existingConversion = await prisma.unitConversion.findFirst({
      where: { id: parseInt(id), companyId }
    });

    if (!existingConversion) {
      return res.status(404).json({ success: false, message: 'Conversion not found' });
    }

    await prisma.unitConversion.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ success: true, message: 'Conversion deleted successfully' });
  } catch (error) {
    console.error('Delete Conversion Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
