# API File Execution Flow - Order of File Calls

## **1. APPLICATION STARTUP SEQUENCE**

```
Step 1: Start Server
   └─→ backend/server.js (FIRST FILE)
       ├─ Loads .env config
       ├─ Requires: express, cors, compression, cookieParser
       ├─ Imports: config/db.js
       ├─ Imports all routes:
       │  ├─ routes/auth.js
       │  ├─ routes/users.js
       │  ├─ routes/expenses.js
       │  ├─ routes/incomes.js
       │  ├─ routes/budgets.js
       │  ├─ routes/categories.js
       │  ├─ routes/loans.js
       │  ├─ routes/savings.js
       │  └─ routes/dashboard.js
       │
       ├─ Setup Middleware
       │  └─ middleware/auth.js (loaded but not used yet)
       │
       └─ Connect to Database
           └─ config/db.js
               └─ Returns MongoDB connection

✅ Server now running on Port 4000
```

---

## **2. FIRST REQUEST - USER LOGIN FLOW**

### **Request:** `POST /api/v1/auth/login`
### **Body:** `{ email: "user@gmail.com", password: "12345" }`

```
EXECUTION ORDER:

1️⃣  server.js (Entry point)
    └─ Routes request to /api/v1/auth
       └─ routes/auth.js (Login handler)
           │
           ├─ Validates email & password format
           │  └─ Uses: express-validator (body validation)
           │
           ├─ Query Database
           │  └─ models/User.js
           │     └─ Searches: db collection "users"
           │
           ├─ Password Comparison
           │  └─ Uses: bcrypt
           │     └─ Compares hashed password in database
           │
           ├─ Generate Tokens
           │  └─ utils/jwt.js
           │     ├─ Creates Access Token (JWT)
           │     └─ Creates Refresh Token
           │
           ├─ Save Refresh Token
           │  └─ models/User.js (save to db)
           │
           └─ Send Response
              └─ Return to Frontend: Access Token + User Data

✅ Frontend stores: accessToken + Refresh Token cookie
```

---

## **3. SECOND REQUEST - FETCH EXPENSES**

### **Request:** `GET /api/v1/expenses?page=1&limit=20`
### **Headers:** `Authorization: Bearer <accessToken>`

```
EXECUTION ORDER:

1️⃣  server.js
    └─ Routes GET /api/v1/expenses
       └─ routes/expenses.js
           │
           ├─ middleware/auth.js (FIRST - Check token)
           │  │
           │  ├─ Verify Authorization header format
           │  ├─ Extract token
           │  └─ utils/jwt.js (Verify & decode token)
           │     └─ Extract userId from JWT
           │
           ├─ Build Filter
           │  └─ buildExpenseFilter() function
           │     ├─ Parse query parameters
           │     ├─ Validate date ranges
           │     └─ Create MongoDB query filter
           │
           ├─ Query Database
           │  └─ models/Expense.js
           │     ├─ Find expenses matching filter
           │     ├─ Populate category details
           │     │  └─ models/Category.js
           │     ├─ Sort by date
           │     ├─ Apply pagination (skip & limit)
           │     └─ Count total documents
           │
           └─ Send Response
              └─ Return: expenses array + pagination info

✅ Frontend receives & displays expenses list
```

---

## **4. CREATE NEW EXPENSE REQUEST**

### **Request:** `POST /api/v1/expenses`
### **Body:** `{ amount: 500, categoryId: "...", date: "2024-01-15T..." }`

```
EXECUTION ORDER:

1️⃣  server.js
    └─ Routes POST /api/v1/expenses
       └─ routes/expenses.js
           │
           ├─ middleware/auth.js (Check token)
           │  └─ utils/jwt.js (Verify token)
           │
           ├─ Validate Request Body
           │  └─ express-validator
           │     ├─ Check amount is float ≥ 0
           │     ├─ Check categoryId is valid MongoDB ID
           │     ├─ Check date is ISO8601 format
           │     └─ Return errors if invalid
           │
           ├─ Create Expense Document
           │  └─ models/Expense.js
           │     ├─ Set user (from JWT token)
           │     ├─ Set amount, category, date
           │     ├─ Set paymentMethod, notes
           │     └─ Save to MongoDB
           │
           ├─ Populate Category Details
           │  └─ models/Category.js (lookup & join)
           │
           └─ Send Response
              └─ Return: Created expense with category info

✅ Frontend receives new expense & updates UI
```

---

## **5. UPDATE EXPENSE REQUEST**

### **Request:** `PATCH /api/v1/expenses/:id`

```
EXECUTION ORDER:

1️⃣  server.js
    └─ Routes PATCH /api/v1/expenses/:id
       └─ routes/expenses.js
           │
           ├─ middleware/auth.js
           │  └─ utils/jwt.js
           │
           ├─ Find Expense
           │  └─ models/Expense.js
           │     └─ Query: { _id: id, user: userId }
           │        (ensures user owns expense)
           │
           ├─ Update Fields
           │  └─ models/Expense.js (findOneAndUpdate)
           │
           ├─ Validate New Data
           │  └─ Mongoose schema validation
           │
           ├─ Populate Category
           │  └─ models/Category.js
           │
           └─ Send Response

✅ Frontend receives updated expense
```

---

## **6. DELETE EXPENSE REQUEST**

### **Request:** `DELETE /api/v1/expenses/:id`

```
EXECUTION ORDER:

1️⃣  server.js
    └─ Routes DELETE /api/v1/expenses/:id
       └─ routes/expenses.js
           │
           ├─ middleware/auth.js
           │  └─ utils/jwt.js
           │
           ├─ Delete Expense
           │  └─ models/Expense.js
           │     └─ findOneAndDelete({ _id: id, user: userId })
           │
           └─ Send Response
              └─ { success: true, message: "Expense deleted" }

✅ Frontend removes expense from UI
```

---

## **FILE HIERARCHY & DEPENDENCIES**

```
📦 BACKEND ROOT
│
├─ 🟢 server.js (Main Entry - FIRST)
│   ├─ config/db.js
│   ├─ middleware/auth.js
│   ├─ routes/
│   │   ├─ auth.js
│   │   ├─ users.js
│   │   ├─ expenses.js
│   │   ├─ incomes.js
│   │   ├─ budgets.js
│   │   ├─ categories.js
│   │   ├─ loans.js
│   │   ├─ savings.js
│   │   └─ dashboard.js
│   │
│   ├─ models/ (Database Schemas)
│   │   ├─ User.js
│   │   ├─ Expense.js
│   │   ├─ Income.js
│   │   ├─ Category.js
│   │   ├─ Budget.js
│   │   ├─ Loan.js
│   │   └─ SavingsGoal.js
│   │
│   ├─ utils/ (Helper Functions)
│   │   ├─ jwt.js
│   │   └─ firebaseAdmin.js
│   │
│   └─ middleware/
│       └─ auth.js
```

---

## **CALL SEQUENCE SUMMARY**

| Order | File | Purpose |
|-------|------|---------|
| 1 | `server.js` | Initialize app, load all routes & middleware |
| 2 | `config/db.js` | Connect to MongoDB |
| 3 | `routes/*.js` | Handle API endpoints (on request) |
| 4 | `middleware/auth.js` | Verify JWT token (on every request) |
| 5 | `utils/jwt.js` | Decode/verify JWT tokens |
| 6 | `models/*.js` | MongoDB operations (CRUD) |
| 7 | `utils/firebaseAdmin.js` | Firebase authentication (if used) |

---

## **FRONTEND FILE CALLS**

```
1. main.jsx (Entry point)
   └─ App.jsx
       ├─ context/AuthContext.jsx (Authentication state)
       ├─ context/DataContext.jsx (Data state)
       ├─ components/Layout.jsx
       ├─ pages/
       │   ├─ Login.jsx
       │   ├─ Expenses.jsx
       │   ├─ Incomes.jsx
       │   └─ ... (other pages)
       │
       └─ utils/api.js (Axios instance)
           └─ Calls: /api/v1/* endpoints
               └─ BACKEND APIs ⬅️
```

---

## **EXAMPLE: Complete Flow for Creating an Expense**

```
🖥️  FRONTEND EXECUTION ORDER
│
1. User clicks "Add Expense" button
│
2. pages/Expenses.jsx (handles form)
│
3. Calls: api.post('/expenses', { amount, categoryId, date, ... })
│
4. utils/api.js (Axios instance)
   ├─ Adds Authorization header
   ├─ Sends HTTP POST request
   └─ Network call to backend


🔄 BACKEND EXECUTION ORDER
│
5. server.js receives request
│
6. routes/expenses.js
   ├─ Calls: middleware/auth.js ✓
   │  └─ Calls: utils/jwt.js (verify token)
   │
   ├─ Validates input with express-validator
   │
   ├─ Calls: models/Expense.js
   │  ├─ Create document
   │  └─ Save to MongoDB
   │
   ├─ Calls: models/Category.js (populate)
   │
   └─ Returns response


🖥️  FRONTEND RECEIVES RESPONSE
│
7. utils/api.js returns data
│
8. pages/Expenses.jsx receives response
│
9. Updates: context/DataContext.jsx (global state)
│
10. UI re-renders with new expense
```
