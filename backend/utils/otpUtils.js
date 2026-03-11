const crypto = require('crypto');
const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true' || EMAIL_PORT === 465;
const FROM_EMAIL = process.env.FROM_EMAIL || EMAIL_USER;

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    return null;
  }

  transporter = nodemailer.createTransport(
    EMAIL_HOST
      ? {
          host: EMAIL_HOST,
          port: EMAIL_PORT,
          secure: EMAIL_SECURE,
          auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD
          }
        }
      : {
          service: EMAIL_SERVICE || 'gmail',
          auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD
          }
        }
  );

  return transporter;
};

const hashOTP = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Generate random OTP (6 digits)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate OTP expiry (10 minutes from now)
const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

// Send OTP via Nodemailer
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  console.log('Sending OTP email to:', email);

  const mailTransporter = getTransporter();
  if (!mailTransporter || !FROM_EMAIL) {
    console.error('Email not configured: missing EMAIL_USER/EMAIL_PASSWORD or FROM_EMAIL');
    return false;
  }

  const subject = purpose === 'signup' 
    ? 'Verify Your Email - Money Manager'
    : 'Password Reset OTP - Money Manager';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #667eea; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .expiry { color: #666; font-size: 14px; margin-top: 10px; }
          .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${purpose === 'signup' ? 'Verify Your Email' : 'Reset Your Password'}</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>${purpose === 'signup' 
              ? 'Thank you for signing up to Money Manager! Please verify your email address using the OTP below.'
              : 'We received a request to reset your password. Use the OTP below to proceed.'
            }</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="expiry">Valid for 10 minutes</div>
            </div>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br><strong>Money Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Money Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = [
    purpose === 'signup' ? 'Verify your email for Money Manager.' : 'Reset your Money Manager password.',
    `Your OTP is: ${otp}`,
    'This code is valid for 10 minutes.',
    "If you didn't request this, you can ignore this email."
  ].join('\n');

  try {
    await mailTransporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    });

    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('Email sending failed:', error?.message || error);
    return false;
  }
};

// Verify OTP
const verifyOTP = (storedOTPHash, providedOTP, otpExpiry) => {
  if (!storedOTPHash || !providedOTP) {
    return { valid: false, message: 'OTP not found' };
  }
  
  if (!otpExpiry || new Date() > otpExpiry) {
    return { valid: false, message: 'OTP has expired' };
  }
  
  if (storedOTPHash !== hashOTP(providedOTP)) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  getOTPExpiry,
  hashOTP,
  sendOTPEmail,
  verifyOTP
};
