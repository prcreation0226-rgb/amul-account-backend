const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basic health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

const authRoutes = require('./routes/authRoutes.js');
const companyRoutes = require('./routes/companyRoutes.js');
const planRoutes = require('./routes/planRoutes.js');
const productRoutes = require('./routes/productRoutes.js');
const customerRoutes = require('./routes/customerRoutes.js');
const invoiceRoutes = require('./routes/invoiceRoutes.js');
const auditRoutes = require('./routes/auditRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
const bankRoutes = require('./routes/bankRoutes.js');
const employeeRoutes = require('./routes/employeeRoutes.js');
const categoryRoutes = require('./routes/categoryRoutes.js');
const expenseRoutes = require('./routes/expenseRoutes.js');
const incomeRoutes = require('./routes/incomeRoutes.js');
const paymentBookRoutes = require('./routes/paymentBookRoutes.js');
const voucherRoutes = require('./routes/voucherRoutes.js');
const bomRoutes = require('./routes/bomRoutes.js');
const partyTagRoutes = require('./routes/partyTagRoutes.js');
const partySettingRoutes = require('./routes/partySettingRoutes.js');
const followupRoutes = require('./routes/followupRoutes.js');
const warehouseRoutes = require('./routes/warehouseRoutes.js');
const offerRoutes = require('./routes/offerRoutes.js');
const unitRoutes = require('./routes/unitRoutes.js');
const unitConversionRoutes = require('./routes/unitConversionRoutes.js');
const inventoryRoutes = require('./routes/inventoryRoutes.js');
const settingRoutes = require('./routes/settingRoutes.js');
const financialRoutes = require('./routes/financialRoutes.js');
const branchRoutes = require('./routes/branchRoutes.js');
const locationRoutes = require('./routes/locationRoutes.js');
const loadingSheetRoutes = require('./routes/loadingSheetRoutes.js');
const currencyRoutes = require('./routes/currencyRoutes.js');
const posRoutes = require('./routes/posRoutes.js');
const productTagRoutes = require('./routes/productTagRoutes.js');
const commissionTypeRoutes = require('./routes/commissionTypeRoutes.js');
const ledgerRoutes = require('./routes/ledgerRoutes.js');
const gstrRoutes = require('./routes/gstrRoutes.js');
const complaintRoutes = require('./routes/complaintRoutes.js');
const serviceReminderRoutes = require('./routes/serviceReminderRoutes.js');
const messageTemplateRoutes = require('./routes/messageTemplateRoutes.js');
const bankStatementRoutes = require('./routes/bankStatementRoutes.js');
const recycleBinRoutes = require('./routes/recycleBinRoutes.js');
const publicRoutes = require('./routes/publicRoutes.js');
const importRoutes = require('./routes/importRoutes.js');

// Public routes (no auth required) — register BEFORE authenticated routes
app.use('/api/v1/public', publicRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/banks', bankRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/incomes', incomeRoutes);
app.use('/api/v1/payments', paymentBookRoutes);
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/boms', bomRoutes);
app.use('/api/v1/party-tags', partyTagRoutes);
app.use('/api/v1/party-settings', partySettingRoutes);
app.use('/api/v1/followups', followupRoutes);
app.use('/api/v1/warehouses', warehouseRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/units', unitRoutes);
app.use('/api/v1/unit-conversions', unitConversionRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/financial', financialRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/loading-sheet', loadingSheetRoutes);
app.use('/api/v1/currencies', currencyRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/product-tags', productTagRoutes);
app.use('/api/v1/commission-types', commissionTypeRoutes);
app.use('/api/v1/ledger', ledgerRoutes);
app.use('/api/v1/gstr', gstrRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/service-reminders', serviceReminderRoutes);
app.use('/api/v1/message-templates', messageTemplateRoutes);
app.use('/api/v1/bank-statements', bankStatementRoutes);
app.use('/api/v1/recycle-bin', recycleBinRoutes);
app.use('/api/v1/import', importRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

module.exports = app;
