# Money Manager - Personal Finance Management System

A full-stack personal money management web application built with React, Vite, Express.js, and MongoDB.

## Features

- **Authentication**: JWT-based secure authentication with refresh tokens
- **Dashboard**: Comprehensive financial overview with charts and statistics
- **Income Management**: Track all income sources
- **Expense Management**: Categorized expense tracking with search and filters
- **Category Management**: Organize expenses and income by categories
- **Budget Planner**: Set monthly budgets and track spending vs limits
- **Savings Goals**: Create and track progress towards financial goals
- **Lending & Borrowing**: Track money lent/borrowed with payment history
- **Reports & Analytics**: Visual charts showing spending patterns
- **Profile Management**: Update preferences, currency, theme, and password

## Tech Stack

**Frontend:**
- React 18
- Vite (build tool)
- Tailwind CSS
- Recharts (for data visualization)
- Axios (HTTP client)
- React Router (navigation)

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing
- express-validator for validation

## Project Structure

```
Money management/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Category.js
│   │   ├── Income.js
│   │   ├── Expense.js
│   │   ├── Budget.js
│   │   ├── SavingsGoal.js
│   │   └── Loan.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── categories.js
│   │   ├── incomes.js
│   │   ├── expenses.js
│   │   ├── budgets.js
│   │   ├── savings.js
│   │   ├── loans.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   └── jwt.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Layout.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Income.jsx
    │   │   ├── Expenses.jsx
    │   │   ├── Categories.jsx
    │   │   ├── Budgets.jsx
    │   │   ├── Savings.jsx
    │   │   ├── Loans.jsx
    │   │   └── Profile.jsx
    │   ├── utils/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    └── vite.config.js
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```powershell
cd backend
```

2. Install dependencies:
```powershell
npm install
```

3. Create `.env` file:
```powershell
Copy-Item .env.example .env
```

4. Edit `.env` and configure:
```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/moneymanager
# Or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/moneymanager
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
CLIENT_ORIGIN=http://localhost:5173
```

5. Start the server:
```powershell
npm run dev
```

Backend will run on http://localhost:4000

### Frontend Setup

1. Navigate to frontend directory:
```powershell
cd frontend
```

2. Install dependencies:
```powershell
npm install
```

3. Start the development server:
```powershell
npm run dev
```

Frontend will run on http://localhost:5173

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### Dashboard
- `GET /api/v1/dashboard` - Get dashboard overview

### Users
- `GET /api/v1/users/me` - Get profile
- `PATCH /api/v1/users/me` - Update profile
- `PATCH /api/v1/users/change-password` - Change password

### Categories
- `GET /api/v1/categories` - Get all categories
- `POST /api/v1/categories` - Create category
- `GET /api/v1/categories/:id` - Get category
- `PATCH /api/v1/categories/:id` - Update category
- `DELETE /api/v1/categories/:id` - Delete category

### Income
- `GET /api/v1/incomes` - Get all incomes
- `POST /api/v1/incomes` - Create income
- `GET /api/v1/incomes/summary` - Get income summary
- `GET /api/v1/incomes/:id` - Get income
- `PATCH /api/v1/incomes/:id` - Update income
- `DELETE /api/v1/incomes/:id` - Delete income

### Expenses
- `GET /api/v1/expenses` - Get all expenses
- `POST /api/v1/expenses` - Create expense
- `GET /api/v1/expenses/summary` - Get expense summary
- `GET /api/v1/expenses/:id` - Get expense
- `PATCH /api/v1/expenses/:id` - Update expense
- `DELETE /api/v1/expenses/:id` - Delete expense

### Budgets
- `GET /api/v1/budgets` - Get budgets
- `POST /api/v1/budgets` - Create budget
- `GET /api/v1/budgets/usage` - Get budget usage
- `PATCH /api/v1/budgets/:id` - Update budget
- `DELETE /api/v1/budgets/:id` - Delete budget

### Savings Goals
- `GET /api/v1/savings` - Get all goals
- `POST /api/v1/savings` - Create goal
- `GET /api/v1/savings/:id` - Get goal
- `PATCH /api/v1/savings/:id` - Update goal
- `DELETE /api/v1/savings/:id` - Delete goal

### Loans
- `GET /api/v1/loans` - Get all loans
- `POST /api/v1/loans` - Create loan
- `POST /api/v1/loans/:id/payments` - Add payment
- `GET /api/v1/loans/:id` - Get loan
- `PATCH /api/v1/loans/:id` - Update loan
- `DELETE /api/v1/loans/:id` - Delete loan

## Usage

1. **Sign Up**: Create a new account with name, email, and password
2. **Login**: Access your account
3. **Dashboard**: View financial overview, charts, and statistics
4. **Categories**: Create categories for organizing expenses/income
5. **Income**: Add income from various sources
6. **Expenses**: Track expenses by category with payment methods
7. **Budgets**: Set monthly budgets and monitor spending
8. **Savings Goals**: Create goals and track progress
9. **Loans**: Record money lent or borrowed with payment tracking
10. **Profile**: Update your preferences and settings

## Security Features

- Passwords hashed with bcrypt
- JWT access tokens (short-lived)
- Refresh tokens (HTTP-only cookies)
- Protected API routes
- Input validation with express-validator

## Deployment

### Frontend (Netlify)
1. Build frontend:
```powershell
cd frontend
npm run build
```
2. Deploy `dist` folder to Netlify
3. Add environment variables if needed

### Backend (Render/Heroku/Railway)
1. Push backend code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy

## Future Enhancements

- Export data (CSV/PDF)
- Email notifications for budgets and due dates
- Multi-currency support
- Recurring transactions
- Receipt upload
- Mobile app
- Data backup/restore
- Admin panel

## License

MIT

## Author

Shubham Kumar
