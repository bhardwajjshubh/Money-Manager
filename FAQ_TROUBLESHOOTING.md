# OTP Implementation - FAQ & Troubleshooting

## ❓ Frequently Asked Questions

### General Questions

**Q: How long is OTP valid for?**
A: 10 minutes. If not used within 10 minutes, the code expires and user must request a new one.

**Q: Can the same OTP be used multiple times?**
A: No. OTP is single-use. Once verified, it's cleared from the database.

**Q: What happens if user closes the browser during signup?**
A: They can start over with a new OTP request. The temporary user record with old OTP will be replaced.

**Q: Can user change email after OTP is requested?**
A: No. The OTP is tied to the specific email. User must request a new OTP for a different email.

**Q: What's the minimum password length?**
A: 8 characters. This is enforced both frontend and backend.

**Q: How many password reset attempts are allowed?**
A: Unlimited. Each reset request generates a new OTP. Consider implementing rate limiting for production.

---

## 🔧 Setup Issues & Solutions

### Email Not Being Sent

**Symptom:** User clicks "Continue" but never receives OTP email.

**Solutions:**
1. **Check environment variables**
   ```bash
   # Verify in backend/.env
   echo $EMAIL_USER
   echo $EMAIL_PASSWORD
   ```

2. **For Gmail:**
   - ❌ DO NOT use your Gmail password
   - ✅ Use [App Password](https://support.google.com/accounts/answer/185833)
   - Verify 2-Step Verification is enabled
   - Check app-specific password in Google Account settings

3. **Test email service independently:**
   ```javascript
   // Create test.js in backend root
   const nodemailer = require('nodemailer');
   
   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: process.env.EMAIL_USER,
       pass: process.env.EMAIL_PASSWORD
     }
   });
   
   transporter.sendMail({
     from: process.env.EMAIL_USER,
     to: 'test@example.com',
     subject: 'Test Email',
     text: 'Test'
   }, (err, info) => {
     if (err) console.log('ERROR:', err);
     else console.log('SUCCESS:', info);
   });
   ```
   Run: `node test.js`

4. **Check email spam folder** - OTP emails might be marked as spam

5. **Verify Nodemailer is installed:**
   ```bash
   npm list nodemailer
   ```

---

### MongoDB Connection Errors

**Symptom:** "MongoDB connection failed" or "User not found" errors

**Solutions:**
1. **Check connection string:**
   ```bash
   # Verify MONGODB_URI in .env
   echo $MONGODB_URI
   ```

2. **IP Whitelist in MongoDB Atlas:**
   - Go to MongoDB Atlas Dashboard
   - Network Access → IP Address
   - Click "Add Current IP Address" (or add 0.0.0.0/0 for dev)

3. **Verify database and collection exist:**
   ```javascript
   // In MongoDB Atlas
   // Check: Database "money-manager" exists
   // Check: Collection "users" exists
   ```

4. **Test connection in backend:**
   ```bash
   npm run dev
   # Should see "MongoDB connected" in console
   ```

---

### CORS & API Errors

**Symptom:** "CORS error" or API requests failing in frontend console

**Solutions:**
1. **Check CORS configuration in backend server.js:**
   ```javascript
   app.use(cors({
     origin: 'http://localhost:5173', // Match your frontend URL
     credentials: true
   }));
   ```

2. **Backend and frontend ports:**
   - Frontend: `http://localhost:5173` (Vite default)
   - Backend: `http://localhost:5000` (configured in server.js)

3. **Axios request configuration:**
   ```javascript
   // In frontend, use:
   fetch('http://localhost:5000/auth/signup-request-otp', {
     credentials: 'include' // Important for cookies
   })
   ```

4. **Check backend is running:**
   ```bash
   cd backend && npm run dev
   ```

---

### OTP Verification Issues

**Symptom:** "Invalid OTP" even though user entered correct code

**Possible Causes & Solutions:**

1. **OTP Case Sensitivity:** OTP codes are case-insensitive (all digits)
   
2. **Extra spaces:** Frontend trims spaces, but check input handling
   
3. **Timing issues:** If user's system clock is significantly off, OTP might appear expired
   
4. **Database record not found:** User might have requested OTP, closed browser, then waited >10 min
   - Solution: Request new OTP

5. **Multiple OTP requests:** If multiple OTPs requested, only latest is stored
   - Solution: Use the most recent OTP received

---

### Password Reset Issues

**Symptom:** "Reset token expired" or "Invalid reset token"

**Solutions:**
1. **Reset token validity:** 15 minutes from verification
   - If longer than 15 min between OTP verification and password submission, token expires
   - Solution: Start over with new OTP request

2. **Wrong email:** Reset token is user-specific
   - Verify correct email was used
   - Solution: Check which email you used in Step 1

3. **Multiple password reset attempts:** Only latest reset token is valid
   - If 2 reset requests made, older token becomes invalid
   - Solution: Use the most recent reset token

---

## 🐛 Common Bugs & Fixes

### Bug #1: OTP Not Clearing After Use
**Issue:** OTP field still has value in database after verification

**Status:** ✅ FIXED in code
```javascript
// In auth.js signup-verify-otp
user.otp = undefined;          // Clear OTP
user.otpExpiry = undefined;    // Clear expiry
user.tempSignupData = undefined; // Clear temp data
await user.save();
```

### Bug #2: User Created Before OTP Verification
**Issue:** User record created when OTP requested, not when verified

**Status:** ✅ FIXED in code
```javascript
// In auth.js signup-request-otp
// Use upsert to update OR create unverified record
await User.updateOne(
  { email },
  { email, otp, otpExpiry, isEmailVerified: false },
  { upsert: true }
);

// In signup-verify-otp, only THEN save full user data
```

### Bug #3: Temporary Data Not Cleared
**Issue:** `window.userData` persists after signup

**Status:** ✅ FIXED in code
```javascript
// In Signup.jsx
const handleOTPVerifySuccess = (data) => {
  delete window.userData; // Clean up
  navigate('/');
};
```

### Bug #4: OTP Input Not Auto-Focusing
**Issue:** User types in first field, has to manually click next fields

**Status:** ✅ FIXED in OtpVerification.jsx
```javascript
// Auto-focus next field
if (value && index < 5) {
  inputRefs.current[index + 1]?.focus();
}

// Backspace navigates to previous field
if (e.key === 'Backspace' && !otp[index] && index > 0) {
  inputRefs.current[index - 1]?.focus();
}
```

---

## 🔍 Debug Mode

### Enable Detailed Logging

**Backend (auth.js):**
```javascript
// Add before/after operations
console.log('OTP Request:', { email });
console.log('Generated OTP:', otp);
console.log('Email Send Result:', emailSent);
console.log('OTP Verification:', { storedOTP, providedOTP, match });
```

**Frontend (OtpVerification.jsx):**
```javascript
// Log API responses
console.log('Verification Response:', data);
console.log('Step Change:', { from: step, to: newStep });
console.log('Timer:', { remaining: timer });
```

### Check Database Directly

**MongoDB Atlas Console:**
```javascript
// Check user OTP status
db.users.findOne({ email: "test@example.com" })

// View response:
{
  _id: ObjectId(...),
  email: "test@example.com",
  otp: "123456",
  otpExpiry: ISODate("2024-01-01T12:15:00Z"),
  isEmailVerified: false
}
```

---

## 📊 Performance Tips

### Optimize Email Sending

**Current (Async - Good):**
```javascript
// Doesn't wait for email to send
const emailSent = await sendOTPEmail(email, otp);
if (!emailSent) { /* handle */ }
```

**For High Volume (Optional):**
```javascript
// Queue email in job processor
const queue = new Bull('otp-emails');
queue.add({ email, otp });
return { success: true }; // Respond immediately
```

### Database Indexing

**Recommended indexes (in MongoDB):**
```javascript
// Index for faster email lookups
db.users.createIndex({ email: 1 })

// Compound index for cleanup queries
db.users.createIndex({ otpExpiry: 1, otp: 1 })
```

### Rate Limiting (Recommended for Production)

```javascript
// Add to backend/routes/auth.js
const rateLimit = require('express-rate-limit');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 OTP requests per window
  message: 'Too many OTP requests, please try again later'
});

router.post('/signup-request-otp', otpLimiter, async (req, res) => {
  // ... rest of code
});
```

---

## 🔐 Security Checklist

- [x] OTP is 6-digit random number
- [x] OTP expires in 10 minutes
- [x] OTP is single-use only
- [x] Passwords are hashed with bcrypt
- [x] JWT tokens are used for authentication
- [x] Refresh tokens stored in httpOnly cookies
- [x] Environment variables for sensitive data
- [x] Input validation on frontend AND backend
- [x] Error messages don't leak sensitive info
- [ ] Rate limiting on OTP requests (TODO)
- [ ] Account lockout after N failed attempts (TODO)
- [ ] OTP attempt logging for audit (TODO)

---

## 📞 Support Resources

**For Email Issues:**
- Gmail App Passwords: https://support.google.com/accounts/answer/185833
- Nodemailer Docs: https://nodemailer.com/
- Common Issues: https://nodemailer.com/about/#faq

**For MongoDB Issues:**
- Atlas Dashboard: https://www.mongodb.com/cloud/atlas
- Connection Docs: https://docs.mongodb.com/drivers/node/

**For CORS Issues:**
- CORS Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

## ✅ Pre-Launch Checklist

Before going to production:

- [ ] Test signup with OTP on production environment
- [ ] Test password reset with OTP
- [ ] Verify email delivery (check spam folder)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Verify error messages are user-friendly
- [ ] Check all links and buttons work
- [ ] Verify database backups are configured
- [ ] Set up monitoring for failed OTP requests
- [ ] Configure HTTPS for production
- [ ] Implement rate limiting
- [ ] Set up error logging/monitoring
- [ ] Create user documentation
- [ ] Train customer support team

---

## 🚀 Production Deployment

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=very-long-random-secret-key-min-32-chars
REFRESH_TOKEN_SECRET=another-very-long-random-secret-key
EMAIL_USER=your-production-email@company.com
EMAIL_PASSWORD=production-app-password
FRONTEND_URL=https://yourdomain.com
```

### Recommended Changes for Production
```javascript
// In otpUtils.js
const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit
const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min (faster)

// In auth.js - Add rate limiting
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});

router.post('/signup-request-otp', signupLimiter, async (req, res) => {
  // ... code
});
```

---

## 📧 Email Template Customization

**To customize email branding:**

Edit `/backend/utils/otpUtils.js`:
```javascript
const htmlContent = `
  <html>
    <!-- Update company logo -->
    <img src="https://your-domain.com/logo.png" />
    
    <!-- Update colors -->
    <div style="background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%)">
      <!-- Content -->
    </div>
    
    <!-- Update footer -->
    <p>© 2024 Your Company. All rights reserved.</p>
  </html>
`;
```

---

## 💡 Best Practices

1. **Always validate on both frontend AND backend**
2. **Use HTTPS in production** (never HTTP)
3. **Implement rate limiting** for OTP requests
4. **Log failed attempts** for security monitoring
5. **Regularly rotate JWT secrets**
6. **Monitor OTP email delivery rates**
7. **Keep dependencies updated** (`npm update`)
8. **Use environment variables** for all secrets
9. **Test backup/recovery processes**
10. **Document any custom changes**

---

This comprehensive FAQ and troubleshooting guide should help resolve most common issues. For additional support, check the other documentation files included with this implementation.
