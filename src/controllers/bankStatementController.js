const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/statements';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });
exports.uploadMiddleware = upload.single('statementFile');

// Get all bank statements
exports.getBankStatements = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const statements = await prisma.bankStatement.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { statementDate: 'desc' },
      include: {
        records: true
      }
    });

    res.json(statements);
  } catch (error) {
    console.error('Error fetching bank statements:', error);
    res.status(500).json({ error: 'Failed to fetch bank statements' });
  }
};

// Upload and parse a new bank statement
// For this API integration, we will mock the parsing and just save dummy records if no real parsing logic is provided.
exports.uploadBankStatement = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { bankName, accountNumber, statementDate } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Example mock parsing (in a real scenario, use csv-parser or xlsx)
    const mockRecords = [
      { date: new Date(), description: 'Payment Received from Client A', credit: 15000, debit: 0, balance: 15000, refNo: 'NEFT123' },
      { date: new Date(), description: 'Supplier B Payment', credit: 0, debit: 5000, balance: 10000, refNo: 'RTGS456' },
    ];

    const newStatement = await prisma.bankStatement.create({
      data: {
        bankName: bankName || 'Unknown Bank',
        accountNumber,
        statementDate: statementDate ? new Date(statementDate) : new Date(),
        fileName: req.file.originalname,
        fileUrl: req.file.path,
        totalCredits: 15000,
        totalDebits: 5000,
        closingBalance: 10000,
        status: 'Processed',
        companyId,
        records: {
          create: mockRecords
        }
      },
      include: {
        records: true
      }
    });

    res.status(201).json(newStatement);
  } catch (error) {
    console.error('Error uploading bank statement:', error);
    res.status(500).json({ error: 'Failed to upload bank statement' });
  }
};

// Delete a bank statement
exports.deleteBankStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const statement = await prisma.bankStatement.updateMany({
      where: { id: parseInt(id), companyId },
      data: { deletedAt: new Date() }
    });

    if (statement.count === 0) {
      return res.status(404).json({ error: 'Bank statement not found' });
    }

    res.json({ message: 'Bank statement deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank statement:', error);
    res.status(500).json({ error: 'Failed to delete bank statement' });
  }
};
