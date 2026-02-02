require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const incomeRoutes = require('./routes/incomes');
const expenseRoutes = require('./routes/expenses');
const budgetRoutes = require('./routes/budgets');
const savingsRoutes = require('./routes/savings');
const loanRoutes = require('./routes/loans');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Enable compression for all responses
app.use(compression());

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const vercelPreviewPattern = /\.vercel\.app$/; // allow Vercel preview deployments

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps, curl, etc.
    const isWhitelisted = allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin);
    if (isWhitelisted) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Disable caching for API responses to avoid stale data after updates/deletes
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

connectDB();

// Register routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/incomes', incomeRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/savings', savingsRoutes);
app.use('/api/v1/loans', loanRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

app.get('/', (req, res) => res.json({ success: true, message: 'Money Manager API' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
