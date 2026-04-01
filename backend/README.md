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

## Firebase Auth Integration (Email Verification + Password Reset)

This backend now supports Firebase-authenticated login via ID token exchange.

Set these env vars in backend:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Endpoint used by frontend after Firebase login:

- POST /api/v1/auth/firebase-auth

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

- POST /api/v1/auth/login
- POST /api/v1/auth/firebase-auth
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

## Next Steps

Tell me when you want to add:
- Remaining models (Category, Income, Expense, Budget, Loan, SavingsGoal)
- API routes for income/expense/categories/budgets/loans
- Frontend (React + Vite + Tailwind)
