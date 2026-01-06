# OTP Implementation - Visual Flows

## Signup Flow Diagram

```
┌─────────────┐
│ Signup Page │
└──────┬──────┘
       │
       ▼
   ┌───────────────────────────────────────┐
   │ STEP 1: Registration Form             │
   │ ─────────────────────────────────     │
   │ • Full Name Input                    │
   │ • Email Address Input                │
   │ • Password Input (8+ chars)          │
   │ • [Continue] Button                  │
   └───────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────────────┐
   │ POST /auth/signup-request-otp               │
   │ {email: "user@example.com"}                 │
   └──────────────────────────────────────────────┘
       │
       ▼ Success
   ┌──────────────────────────────────────────┐
   │ Nodemailer Sends Email with OTP         │
   │ ──────────────────────────────────────  │
   │ To: user@example.com                    │
   │ OTP Code: 6-digit random number        │
   │ Expires: 10 minutes                     │
   └──────────────────────────────────────────┘
       │
       ▼
   ┌───────────────────────────────────────┐
   │ STEP 2: OTP Verification Page          │
   │ ─────────────────────────────────     │
   │ • 6 Digit Input Fields                │
   │ • Timer: 2 min until Resend Available │
   │ • [Verify OTP] Button                 │
   │ • [Resend Code] Button (after timer)  │
   └───────────────────────────────────────┘
       │
       ▼
   ┌────────────────────────────────────────────────┐
   │ POST /auth/signup-verify-otp                  │
   │ {email, otp, name, password}                 │
   └────────────────────────────────────────────────┘
       │
       ├─ Invalid OTP ─► Error Message ──┐
       │                                  │
       │                                  ▼
       │                          [Try Again] or [Resend]
       │
       ├─ Expired OTP ─────────► Error Message ──┐
       │                                         │
       │                                         ▼
       │                                 [Resend Code]
       │
       └─ Valid OTP ────────┐
                            ▼
   ┌────────────────────────────────────┐
   │ ✅ Account Created Successfully    │
   │ ────────────────────────────────  │
   │ • User saved to MongoDB           │
   │ • JWT tokens generated           │
   │ • Refresh token cookie set       │
   │ • Email marked verified          │
   └────────────────────────────────────┘
       │
       ▼
   ┌────────────────────────┐
   │ 🎉 Auto Login          │
   │ Redirect to Dashboard  │
   └────────────────────────┘
```

---

## Password Reset Flow Diagram

```
┌──────────────┐
│ Login Page   │
└──────┬───────┘
       │
       ▼
   [Forgot password?] link
       │
       ▼
   ┌───────────────────────────────────────┐
   │ STEP 1: Forgot Password Page           │
   │ ─────────────────────────────────     │
   │ • Email Input Field                  │
   │ • [Send OTP] Button                  │
   │ • [Back to Login] Button              │
   └───────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────────────┐
   │ POST /auth/forgot-password-request-otp      │
   │ {email: "user@example.com"}                 │
   └──────────────────────────────────────────────┘
       │
       ├─ User Not Found ────┐
       │                     ▼
       │             "Email doesn't exist" (generic)
       │             [Back to Login]
       │
       └─ User Found ────┐
                        ▼
   ┌──────────────────────────────────────────┐
   │ Nodemailer Sends Email with OTP         │
   │ ──────────────────────────────────────  │
   │ To: user@example.com                    │
   │ Purpose: Password Reset                 │
   │ OTP Code: 6-digit random number        │
   │ Expires: 10 minutes                     │
   └──────────────────────────────────────────┘
       │
       ▼
   ┌───────────────────────────────────────┐
   │ STEP 2: OTP Verification Page          │
   │ ─────────────────────────────────     │
   │ • Shows email: user@example.com       │
   │ • 6 Digit Input Fields                │
   │ • Timer: 2 min until Resend Available │
   │ • [Verify OTP] Button                 │
   │ • [Back] Button                       │
   └───────────────────────────────────────┘
       │
       ▼
   ┌────────────────────────────────────────────────┐
   │ POST /auth/forgot-password-verify-otp         │
   │ {email, otp}                                  │
   └────────────────────────────────────────────────┘
       │
       ├─ Invalid OTP ─► "Invalid OTP" ──┐
       │                                  │
       │                                  ▼
       │                          [Try Again]
       │
       ├─ Expired OTP ─► "OTP Expired" ──┐
       │                                  │
       │                                  ▼
       │                          [Back to Email]
       │
       └─ Valid OTP ────────┐
                            ▼
   ┌────────────────────────────────────────┐
   │ Generate Reset Token                   │
   │ Store: resetPasswordHash, expiry       │
   │ Return: resetToken (15 min validity)   │
   └────────────────────────────────────────┘
       │
       ▼
   ┌───────────────────────────────────────┐
   │ STEP 3: Reset Password Page            │
   │ ─────────────────────────────────     │
   │ • New Password Input                  │
   │ • Confirm Password Input              │
   │ • [Reset Password] Button              │
   │ • [Back to Login] Button               │
   └───────────────────────────────────────┘
       │
       ▼
   ┌────────────────────────────────────────┐
   │ Validate Passwords                     │
   │ ──────────────────────────────────    │
   │ • Both fields filled                  │
   │ • Passwords match                    │
   │ • Length >= 8 characters              │
   └────────────────────────────────────────┘
       │
       ├─ Validation Failed ──► Error Message
       │                            │
       │                            ▼
       │                      [Try Again]
       │
       └─ Valid ─────────┐
                        ▼
   ┌────────────────────────────────────┐
   │ POST /auth/reset-password          │
   │ {email, resetToken, newPassword}  │
   └────────────────────────────────────┘
       │
       ├─ Invalid Token ───► Error ──────┐
       │                                  │
       │                                  ▼
       │                          [Back to Email]
       │
       ├─ Token Expired ──► Error ──────┐
       │                                  │
       │                                  ▼
       │                          [Request New OTP]
       │
       └─ Valid Token ─────┐
                            ▼
   ┌────────────────────────────────────────┐
   │ ✅ Password Reset Successfully        │
   │ ────────────────────────────────────  │
   │ • New password hashed with bcrypt    │
   │ • Reset token cleared               │
   │ • User can login with new password  │
   └────────────────────────────────────────┘
       │
       ▼
   ┌────────────────────────────────────┐
   │ Success Message                    │
   │ "Password reset successfully"      │
   │ Redirect to Login Page in 2 sec   │
   └────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────┐
   │ 🎉 Login with New    │
   │    Password          │
   └──────────────────────┘
```

---

## Component Architecture

```
Frontend Structure:
──────────────────

App.jsx
│
├─ /login ────────► Login.jsx
│
├─ /signup ───────► Signup.jsx
│                      │
│                      ├─ Step 1: Form
│                      │
│                      └─ Step 2: OtpVerification.jsx
│                              │
│                              ├─ OTP Input (6 digits)
│                              ├─ Timer/Resend
│                              └─ Error Handling
│
└─ /forgot-password ► ForgetPassword.jsx
                       │
                       ├─ Step 1: Email Form
                       │
                       ├─ Step 2: OtpVerification.jsx
                       │              (reused)
                       │
                       └─ Step 3: Password Reset Form


Backend Structure:
──────────────────

Express Server
│
├─ /routes/auth.js
│   ├─ POST /signup-request-otp
│   ├─ POST /signup-verify-otp
│   ├─ POST /forgot-password-request-otp
│   ├─ POST /forgot-password-verify-otp
│   └─ POST /reset-password
│
├─ /utils/otpUtils.js
│   ├─ generateOTP()
│   ├─ getOTPExpiry()
│   ├─ sendOTPEmail() ─────► Nodemailer
│   └─ verifyOTP()
│
└─ /models/User.js
    ├─ otp (String)
    ├─ otpExpiry (Date)
    ├─ isEmailVerified (Boolean)
    ├─ tempSignupData (Object)
    ├─ resetPasswordHash (String)
    └─ resetPasswordExpiry (Date)
```

---

## Data Flow: OTP Request to Verification

```
User Input                   Frontend                 Backend              Database
─────────────               ──────────              ──────────           ──────────

Email                       
Entered            ──────────────────────────────►  signup-request-otp
                            POST Request                    │
                                                            ▼
                                                    Generate OTP Code
                                                    (6 random digits)
                                                            │
                                                            ▼
                                                    Set OTP Expiry
                                                    (Now + 10 min)
                                                            │
                                                            ▼
                                                    Update User Document
                                                    { otp, otpExpiry }   ◄──── Save


                                                    Send Email via
                                                    Nodemailer
                                                    (async - no wait)
                                                            │
                            Return Success           ◄──────
                            { success: true }
                            
                   ◄──────────────────────────────

OTP Received       Check Email
in Mailbox         and Copy OTP

OTP Code
Entered
                   ──────────────────────────────►  signup-verify-otp
                            POST Request                    │
                                                            ▼
                                                    Find User by Email
                                                    Get stored OTP
                                                    Get stored OtpExpiry   ◄──── Read


                                                    Compare OTPs
                                                    Check Expiry
                                                    │
                        ├─ Match & Valid ─────────►  Create User
                        │                             Hash Password
                        │                             Clear OTP fields     ───► Update
                        │                             Set isEmailVerified
                        │                             Generate JWT tokens
                        │
                        │           ◄───────────────  Return tokens
                        │           { accessToken, user }
                        │
                        ▼
                   Receive Tokens
                   Store in Memory
                   & Cookies
                   
                   Redirect to Dashboard
                   
                   ✅ Account Created & Logged In
```

---

## Security State Machine

```
OTP Verification State Transitions:

[Initial State]
      │
      ├─ No OTP ───► [Awaiting OTP]
      │                    │
      │                    ├─ OTP Request
      │                    │    │
      │                    │    ▼
      │                [OTP Sent]
      │                    │
      │                    └─ User Enters OTP
      │                         │
      │                         ▼
      │                    [Verification]
      │                         │
      │      ┌──────────────────┼──────────────────┐
      │      │                  │                  │
      │      ▼                  ▼                  ▼
      │   [Valid]          [Invalid]          [Expired]
      │      │                  │                  │
      │      ▼                  ▼                  ▼
      │  [Verified]      [Error - Retry]    [Error - Resend]
      │      │                  │                  │
      │      └──────────────────┼──────────────────┘
      │                         │
      │                         ▼
      │                  [Return to Form]
      │
      └─────► [Account Created]
```

---

## Email Template Flow

```
┌─────────────────────────────────────────────────────────┐
│                    EMAIL TEMPLATE                       │
│─────────────────────────────────────────────────────────│
│                                                         │
│  ╔═════════════════════════════════════╗              │
│  ║  📧 MONEY MANAGER                   ║              │
│  ║  Verify Your Email                  ║              │
│  ╚═════════════════════════════════════╝              │
│                                                         │
│  Hello,                                                 │
│                                                         │
│  Thank you for signing up to Money Manager!           │
│  Please verify your email using the code below:       │
│                                                         │
│  ╔═════════════════════════════════════╗              │
│  ║       1 2 3 4 5 6                   ║              │
│  ║   (6-digit OTP code)                ║              │
│  ║       Valid for 10 minutes          ║              │
│  ╚═════════════════════════════════════╝              │
│                                                         │
│  If you didn't request this, ignore this email.       │
│                                                         │
│  Best regards,                                          │
│  Money Manager Team                                     │
│                                                         │
│  ©️ 2024 Money Manager. All rights reserved.          │
│                                                         │
└─────────────────────────────────────────────────────────┘

HTML Includes:
- Professional branding
- Gradient header background
- Clear OTP display (32px font)
- Letter-spacing for readability
- Expiry time emphasized
- Security footer
- Responsive design
```

---

## Error Handling Flow

```
API Request
    │
    ▼
┌─────────────────┐
│ Validate Input  │
└────────┬────────┘
         │
    ┌────┴────────┐
    ▼             ▼
[Valid]       [Invalid]
    │             │
    │             ▼
    │        Return 400
    │        { errors: [...] }
    │
    ▼
┌──────────────────┐
│ Execute Logic    │
└────────┬─────────┘
         │
    ┌────┴───────────────────┐
    ▼                        ▼
[Success]              [Server Error]
    │                        │
    ▼                        ▼
Return 200/201          Return 500
{ success: true,        { success: false,
  data: {...} }          message: "..." }
    │
    ▼
┌──────────────────┐
│ Frontend         │
│ Handling         │
└────────┬─────────┘
         │
    ┌────┴─────────────┬──────────────────┐
    ▼                  ▼                  ▼
[Navigate]        [Error Msg]         [Retry]
Dashboard         Display             Available
                  To User
```

---

This visual guide helps understand the complete OTP implementation flow from user interaction through backend processing to final verification.
