# Quick Start Guide - OTP Verification Setup

## Prerequisites
- Node.js and npm installed
- MongoDB Atlas cluster set up
- Gmail account (or other email service)

## Setup Instructions

### Step 1: Backend Configuration

1. **Install nodemailer**
   ```bash
   cd backend
   npm install
   ```

2. **Update .env file** with your MongoDB and email credentials:
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/money-manager
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-specific-password
   JWT_SECRET=your_secure_secret_key
   ```

3. **Generate Gmail App Password** (recommended):
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification" if not already enabled
   - Create an [App Password](https://support.google.com/accounts/answer/185833)
   - Use this 16-character password in EMAIL_PASSWORD

### Step 2: Start Backend
```bash
npm run dev
```
Backend should start on `http://localhost:5000`

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```
Frontend should start on `http://localhost:5173`

### Step 4: Test the Feature

**Test Signup with OTP:**
1. Go to http://localhost:5173/signup
2. Fill in name, email, and password
3. Click "Continue"
4. Check email for 6-digit OTP
5. Enter OTP and verify

**Test Password Reset:**
1. Go to http://localhost:5173/login
2. Click "Forgot password?"
3. Enter your email
4. Check email for OTP
5. Verify OTP and set new password

## Email Service Alternatives

### Outlook/Hotmail
```javascript
service: 'outlook'
```

### Yahoo Mail
```javascript
service: 'yahoo'
auth: {
  user: 'your-email@yahoo.com',
  pass: 'your-app-specific-password'
}
```

### SendGrid API
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| OTP not sent | Check EMAIL_USER, EMAIL_PASSWORD in .env |
| MongoDB error | Verify MongoDB connection string and IP whitelist |
| CORS errors | Ensure backend is running on correct port |
| Email not received | Check spam folder, verify App Password for Gmail |

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/utils/otpUtils.js` | OTP generation and email sending |
| `backend/routes/auth.js` | Authentication endpoints |
| `frontend/pages/OtpVerification.jsx` | OTP input component |
| `frontend/pages/ForgetPassword.jsx` | Password reset page |

## Security Reminders

✅ Always use environment variables for sensitive data
✅ Enable 2-Step Verification on your email account
✅ Use App Passwords instead of regular passwords
✅ Keep JWT_SECRET strong and unique
✅ Never commit .env file to version control

---

**You're all set!** Your Money Manager app now has secure OTP-based authentication. 🎉
