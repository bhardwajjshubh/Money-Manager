# Money Manager - OTP Verification Implementation

## Overview
The Money Manager application now includes OTP (One-Time Password) verification for both signup and password reset flows, enhancing security and user verification.

## Features Implemented

### 1. Signup with OTP Verification
- **Step 1**: User enters email and receives OTP
- **Step 2**: User verifies OTP sent to their email
- **Step 3**: User creates account with name and password

### 2. Password Reset with OTP
- **Step 1**: User requests password reset by entering email
- **Step 2**: User receives OTP and verifies it
- **Step 3**: User sets new password securely

## Backend Implementation

### New Files Created

#### `/backend/utils/otpUtils.js`
Utility functions for OTP management:
- `generateOTP()` - Generates a random 6-digit OTP
- `getOTPExpiry()` - Returns expiry time (10 minutes from now)
- `sendOTPEmail()` - Sends OTP via email using Nodemailer
- `verifyOTP()` - Validates OTP against stored value and expiry

#### `/backend/routes/auth.js` (Updated)
New endpoints added:

**Signup Flow:**
- `POST /auth/signup-request-otp` - Request OTP for email
- `POST /auth/signup-verify-otp` - Verify OTP and create user account

**Password Reset Flow:**
- `POST /auth/forgot-password-request-otp` - Request OTP for password reset
- `POST /auth/forgot-password-verify-otp` - Verify OTP and get reset token
- `POST /auth/reset-password` - Reset password with reset token

#### `/backend/models/User.js` (Updated)
New fields added to User schema:
```javascript
otp: String                    // Stores OTP code
otpExpiry: Date               // OTP expiration time
isEmailVerified: Boolean       // Tracks email verification status
tempSignupData: Object        // Temporary storage for signup data
resetPasswordHash: String     // For password reset token
resetPasswordExpiry: Date     // Password reset token expiry
```

### Environment Variables Required
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

**Note**: For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

## Frontend Implementation

### New Components Created

#### `/frontend/src/pages/OtpVerification.jsx`
Reusable component for OTP input and verification:
- 6-digit OTP input fields with auto-focus
- 2-minute countdown timer
- Resend OTP functionality
- Works for both signup and password reset

#### `/frontend/src/pages/ForgetPassword.jsx`
Three-step password reset flow:
- Email request
- OTP verification
- New password creation

### Updated Components

#### `/frontend/src/pages/Signup.jsx`
- Two-step signup: Email/Password → OTP Verification
- Temporary storage of signup data in `window.userData`
- Improved UX with loading states

#### `/frontend/src/pages/Login.jsx`
- Updated "Forgot Password?" link to point to `/forgot-password`

#### `/frontend/src/App.jsx`
- Added route for `/forgot-password` page

## Security Features

1. **OTP Validation**
   - 6-digit random code
   - 10-minute expiry time
   - One-time use only

2. **Email Verification**
   - Confirms user owns the email
   - Prevents account takeover

3. **Password Reset**
   - Secure token-based reset
   - 15-minute reset window
   - Requires valid OTP verification first

4. **Data Protection**
   - Passwords hashed with bcrypt
   - OTP not persisted in plaintext
   - Temporary signup data cleared after verification

## Installation & Setup

### 1. Install Dependencies
```bash
cd backend
npm install nodemailer
```

### 2. Configure Email Service
Update `.env` file:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the App Password in `EMAIL_PASSWORD`

**For Other Email Providers:**
Update the transporter configuration in `/backend/utils/otpUtils.js`:
```javascript
const transporter = nodemailer.createTransport({
  service: 'outlook', // or 'sendgrid', 'mailgun', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

### 3. Start the Application
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## API Endpoints

### Signup Flow
```
POST /auth/signup-request-otp
{
  "email": "user@example.com"
}

POST /auth/signup-verify-otp
{
  "email": "user@example.com",
  "otp": "123456",
  "name": "John Doe",
  "password": "SecurePassword123"
}
```

### Password Reset Flow
```
POST /auth/forgot-password-request-otp
{
  "email": "user@example.com"
}

POST /auth/forgot-password-verify-otp
{
  "email": "user@example.com",
  "otp": "123456"
}

POST /auth/reset-password
{
  "email": "user@example.com",
  "resetToken": "token-from-verify",
  "newPassword": "NewSecurePassword123"
}
```

## Testing

### Test Signup with OTP
1. Navigate to `/signup`
2. Enter name, email, password
3. Click "Continue"
4. Check email for OTP
5. Enter 6-digit OTP
6. Account created and logged in

### Test Password Reset
1. Click "Forgot password?" on login page
2. Enter email address
3. Check email for OTP
4. Enter OTP and new password
5. Redirect to login with success message

## Troubleshooting

### OTP Not Received
- Check EMAIL_USER and EMAIL_PASSWORD in `.env`
- Verify Gmail App Password is correct (not regular password)
- Check spam/junk folder
- Ensure MongoDB is running

### MongoDB Connection Issues
- Verify MONGO_URI in `.env`
- Ensure IP is whitelisted in MongoDB Atlas
- Check network connectivity

### CORS Issues
- Verify FRONTEND_URL in backend `.env`
- Ensure axios requests use `withCredentials: true`
- Check browser console for specific errors

## Future Enhancements

1. SMS-based OTP option
2. OTP attempt limiting and account lockout
3. Email verification for existing accounts
4. Two-factor authentication (2FA) with TOTP
5. Biometric authentication support

## Files Modified/Created

**Backend:**
- ✅ `/backend/utils/otpUtils.js` (new)
- ✅ `/backend/routes/auth.js` (updated)
- ✅ `/backend/models/User.js` (updated)
- ✅ `/backend/package.json` (updated - added nodemailer)
- ✅ `/backend/.env.example` (updated)

**Frontend:**
- ✅ `/frontend/src/pages/OtpVerification.jsx` (new)
- ✅ `/frontend/src/pages/ForgetPassword.jsx` (new)
- ✅ `/frontend/src/pages/Signup.jsx` (updated)
- ✅ `/frontend/src/pages/Login.jsx` (updated)
- ✅ `/frontend/src/App.jsx` (updated)

## Performance Considerations

- OTP expiry set to 10 minutes (configurable in `otpUtils.js`)
- Reset token expiry set to 15 minutes
- Email sending is asynchronous, won't block API responses
- Temporary data cleared from window object after verification

---

**Last Updated**: 2024  
**Status**: ✅ Complete and Ready for Production
