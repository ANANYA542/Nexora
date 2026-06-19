require('dotenv').config();
const express = require('express');

const { errorHandler } = require('./src/middlewares/errorHandler');


const authRoutes          = require('./src/routes/auth.routes');
const categoryRoutes      = require('./src/routes/category.routes');
const transactionRoutes   = require('./src/routes/transaction.routes');
const dashboardRoutes     = require('./src/routes/dashboard.routes');
const reportRoutes        = require('./src/routes/report.routes');
const budgetRoutes        = require('./src/routes/budget.routes');
const notificationRoutes  = require('./src/routes/notification.routes');
const aiRoutes            = require('./src/routes/ai.routes');
const goalRoutes          = require('./src/routes/goal.routes');
const investmentRoutes    = require('./src/routes/investment.routes');
const accountRoutes       = require('./src/routes/account.routes');
const healthRoutes         = require('./src/routes/health.routes');
const schedulerService    = require('./src/services/SchedulerService');

const cors = require('cors');

const app = express();

const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));


app.use('/api/auth',          authRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/budgets',       budgetRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/investments',   investmentRoutes);
app.use('/api/accounts',      accountRoutes);
app.use('/api/health',        healthRoutes);

  schedulerService.start().catch(err => 
    console.error('[SCHEDULER] Failed to start:', err.message)
  );

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
