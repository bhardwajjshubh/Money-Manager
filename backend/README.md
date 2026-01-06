# Money Manager Backend

Express + MongoDB backend with JWT authentication.

## Quick Start

1. Install dependencies:
```powershell
cd backend
npm install
```

2. Create `.env` file:
```powershell
Copy-Item .env.example .env
```

3. Edit `.env` and set your MongoDB URI and JWT secret.

4. Run dev server:
```powershell
npm run dev
```

Server runs on http://localhost:4000

## Auth Endpoints Created

- POST /api/v1/auth/signup
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

## Next Steps

Tell me when you want to add:
- Remaining models (Category, Income, Expense, Budget, Loan, SavingsGoal)
- API routes for income/expense/categories/budgets/loans
- Frontend (React + Vite + Tailwind)
