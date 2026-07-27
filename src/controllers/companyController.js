const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: { plan: true }
    });
    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCompany = async (req, res) => {
  const { name, ownerEmail, ownerName, planId, phone, address, startDate, expireDate, planType, logo, password } = req.body;

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already in use' });
    }

    const hashedPassword = await bcrypt.hash(password || 'password123', 10); // Use provided password or default

    // Use Prisma transaction to ensure both or neither are created
    const newCompany = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name,
          ownerName,
          ownerEmail,
          phone: phone || null,
          address: address || null,
          startDate: startDate ? new Date(startDate) : null,
          expireDate: expireDate ? new Date(expireDate) : null,
          planType: planType || null,
          logo: logo || null,
          planId: planId ? parseInt(planId) : null,
        },
        include: { plan: true }
      });

      await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          password: hashedPassword,
          role: 'COMPANY_ADMIN',
          companyId: company.id
        }
      });

      return company;
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: newCompany
    });
  } catch (error) {
    console.error('createCompany error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const company = await prisma.company.update({
      where: { id: parseInt(id) },
      data: { status }
    });
    res.status(200).json({ success: true, message: 'Status updated', data: company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateCompany = async (req, res) => {
  const { id } = req.params;
  const { name, ownerName, ownerEmail, planId, phone, address, startDate, expireDate, planType, logo, password } = req.body;
  try {
    const updatedCompany = await prisma.$transaction(async (tx) => {
      const comp = await tx.company.update({
        where: { id: parseInt(id) },
        data: { 
          name, 
          ownerName, 
          ownerEmail, 
          phone: phone !== undefined ? phone : undefined,
          address: address !== undefined ? address : undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          expireDate: expireDate ? new Date(expireDate) : undefined,
          planType: planType !== undefined ? planType : undefined,
          logo: logo !== undefined ? logo : undefined,
          planId: planId ? parseInt(planId) : null 
        },
        include: { plan: true }
      });

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await tx.user.updateMany({
          where: { email: ownerEmail, companyId: comp.id },
          data: { password: hashedPassword }
        });
      }

      return comp;
    });

    res.status(200).json({ success: true, message: 'Company updated', data: updatedCompany });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteCompany = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete associated users first if there's no cascade delete
    await prisma.user.deleteMany({ where: { companyId: parseInt(id) } });
    await prisma.company.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ success: true, message: 'Company deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMeCompany = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(404).json({ success: false, message: 'No company attached' });
    const comp = await prisma.company.findUnique({ where: { id: companyId } });
    res.status(200).json({ success: true, data: comp });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateMeCompany = async (req, res) => {
  try {
    if (req.user.role !== 'COMPANY_ADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const companyId = req.user.companyId;
    const { name, phone, address, logo } = req.body;
    
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { name, phone, address, logo }
    });
    res.status(200).json({ success: true, message: 'Updated', data: updated });
  } catch (error) {
    console.error('updateMeCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
