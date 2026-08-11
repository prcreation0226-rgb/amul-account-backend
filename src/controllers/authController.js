const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { name, contactNumber, email, password, companyName } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Company and User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName || 'My Company',
          ownerName: name,
          ownerEmail: email,
          phone: contactNumber,
          status: 'ACTIVE'
        }
      });

      // Provide default settings for the new company
      await tx.companySetting.create({
        data: { companyId: company.id }
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'COMPANY_ADMIN',
          companyId: company.id
        }
      });

      // Seed default vouchers
      const defaultVouchers = [
        { type: 'Company Purchase', voucherId: '1', head: '', companyId: company.id },
        { type: 'Customer Sale', voucherId: '1', head: '', companyId: company.id },
        { type: 'Customer Sale Return', voucherId: '1', head: '', companyId: company.id },
        { type: 'Bank Ledger', voucherId: '1', head: '', companyId: company.id },
        { type: 'Customer Challan Invoice', voucherId: '1', head: '', companyId: company.id },
        { type: 'Complain Booking', voucherId: '1', head: '', companyId: company.id },
        { type: 'Customer Quotation', voucherId: '1', head: '', companyId: company.id },
        { type: 'Customer Payment', voucherId: '1', head: '', companyId: company.id },
        { type: 'Stock Adjustment', voucherId: '1', head: '', companyId: company.id },
        { type: 'Customer Sale Order', voucherId: '1', head: '', companyId: company.id },
        { type: 'Company Payment', voucherId: '1', head: '', companyId: company.id }
      ];

      await tx.voucher.createMany({
        data: defaultVouchers
      });

      return { company, user };
    });

    const tokenPayload = {
      id: result.user.id,
      role: result.user.role,
      companyId: result.user.companyId
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        companyId: result.user.companyId,
        createdAt: result.user.createdAt
      }
    });

  } catch (error) {
    console.error("Register Error: ", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { company: true }
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.company && user.company.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, message: 'Account is Deactivated. Please contact Superadmin.' });
    }

    const tokenPayload = {
      id: user.id,
      role: user.role,
      companyId: user.companyId
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.impersonate = async (req, res) => {
  const { companyId } = req.body;

  try {
    // Only SUPERADMIN can hit this due to middleware
    const company = await prisma.company.findUnique({ where: { id: parseInt(companyId) } });
    
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Generate impersonated token
    const tokenPayload = {
      id: req.user.id, // Superadmin's original ID
      role: 'COMPANY_ADMIN', // Act as Company Admin
      companyId: company.id,
      impersonatorId: req.user.id // Track original identity for audit logs
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '2h' });

    res.status(200).json({
      success: true,
      token,
      company: { id: company.id, name: company.name }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /auth/me - Get own profile from DB
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        company: {
          select: {
            expireDate: true
          }
        }
      }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /auth/me - Update own profile
exports.updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true
      }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const userRole = req.user.role;
    let users = [];

    if (userRole === 'SUPERADMIN') {
      // Superadmin sees all users
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          createdAt: true,
          company: {
            select: { name: true }
          }
        },
        orderBy: { id: 'asc' }
      });
    } else if (userRole === 'COMPANY_ADMIN') {
      // Company Admin sees users of their own company
      users = await prisma.user.findMany({
        where: { companyId: req.user.companyId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          createdAt: true,
          company: {
            select: { name: true }
          }
        },
        orderBy: { id: 'asc' }
      });
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /auth/register-sub-user
exports.registerSubUser = async (req, res) => {
  try {
    const { name, password, role, allowFirms, stores, books } = req.body;
    
    // Only SUPERADMIN or COMPANY_ADMIN should be able to create sub-users
    if (req.user.role !== 'SUPERADMIN' && req.user.role !== 'COMPANY_ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to create users' });
    }

    // A dummy unique email generator if email is not provided
    const userEmail = req.body.email || `user_${Date.now()}@${req.user.companyId}.local`;

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const notificationPermissions = {
      allowFirms: allowFirms || [],
      stores: stores || [],
      books: books || []
    };

    const newUser = await prisma.user.create({
      data: {
        name,
        email: userEmail,
        password: hashedPassword,
        role: role || 'STAFF',
        companyId: req.user.companyId,
        notificationPermissions: notificationPermissions
      }
    });

    res.status(201).json({ success: true, message: 'User registered successfully', data: { id: newUser.id, name: newUser.name } });
  } catch (error) {
    console.error('registerSubUser error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
