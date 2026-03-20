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

### OTP Email Provider (Recommended on Render)

Use Resend API for OTP delivery:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Money Manager <onboarding@resend.dev>
```

Optional SMTP fallback (only used if Resend fails or is not configured):

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SERVICE=gmail
FROM_EMAIL=your-email@gmail.com
```

4. Run dev server:
```powershell
npm run dev
```

Server runs on http://localhost:4000

## One-time duplicate category cleanup

If your database already contains duplicate categories (same name + type for the same user), run:

```powershell
npm run cleanup:categories
```

This runs in **dry-run** mode and prints what would be merged.

To apply the cleanup:

```powershell
npm run cleanup:categories -- --apply
```

What it does:
- Keeps the oldest category per user + type + name (case-insensitive)
- Reassigns related `expenses` and `incomes` to the kept category
- Reassigns related `budgets` where possible
- Deletes duplicate category records

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
