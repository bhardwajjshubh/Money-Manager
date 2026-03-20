const crypto = require('crypto');
const nodemailer = require('nodemailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true' || EMAIL_PORT === 465;
const FROM_EMAIL = process.env.FROM_EMAIL || EMAIL_USER;

const SMTP_TIME_LIMITS = {
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
};

const getTransportConfigs = () => {
  if (!EMAIL_USER || !EMAIL_PASSWORD) return [];

  const auth = { user: EMAIL_USER, pass: EMAIL_PASSWORD };

  if (EMAIL_HOST) {
    return [{
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth,
      ...SMTP_TIME_LIMITS
    }];
  }

  const normalizedService = (EMAIL_SERVICE || 'gmail').toLowerCase();

  // For Gmail, try STARTTLS first (587), then SSL (465) as fallback.
  if (normalizedService === 'gmail') {
    return [
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth,
        ...SMTP_TIME_LIMITS
      },
      {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth,
        ...SMTP_TIME_LIMITS
      }
    ];
  }

  return [{
    service: EMAIL_SERVICE,
    auth,
    ...SMTP_TIME_LIMITS
  }];
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

const buildEmailContent = (otp, purpose) => {
  const subject = purpose === 'signup'
    ? 'Verify Your Email - Money Manager'
    : 'Password Reset OTP - Money Manager';

  const html = `
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
            <p>If you did not request this, please ignore this email.</p>
            <p>Best regards,<br><strong>Money Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Money Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    purpose === 'signup' ? 'Verify your email for Money Manager.' : 'Reset your Money Manager password.',
    `Your OTP is: ${otp}`,
    'This code is valid for 10 minutes.',
    "If you did not request this, you can ignore this email."
  ].join('\n');

  return { subject, html, text };
};

const sendOTPViaResend = async (email, subject, html, text) => {
  if (!RESEND_API_KEY) return false;

  const from = RESEND_FROM_EMAIL || FROM_EMAIL;
  if (!from) {
    console.error('Resend not configured: missing RESEND_FROM_EMAIL (or FROM_EMAIL)');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend API error (${response.status}):`, errorText);
      return false;
    }

    console.log('Email sent successfully via Resend API');
    return true;
  } catch (error) {
    console.error('Resend request failed:', error?.message || error);
    return false;
  }
};

const sendOTPViaSmtp = async (email, subject, html, text) => {
  const transportConfigs = getTransportConfigs();
  if (transportConfigs.length === 0 || !FROM_EMAIL) {
    console.error('SMTP email not configured: missing EMAIL_USER/EMAIL_PASSWORD or FROM_EMAIL');
    return false;
  }

  for (const config of transportConfigs) {
    try {
      const transportLabel = config.host ? `${config.host}:${config.port}` : `service:${config.service}`;
      const mailTransporter = nodemailer.createTransport(config);

      await mailTransporter.sendMail({
        from: FROM_EMAIL,
        to: email,
        subject,
        text,
        html
      });

      console.log('Email sent successfully via', transportLabel);
      return true;
    } catch (error) {
      const transportLabel = config.host ? `${config.host}:${config.port}` : `service:${config.service}`;
      console.error(`Email sending failed via ${transportLabel}:`, error?.message || error);
    }
  }

  return false;
};

// Send OTP via Resend API first, then SMTP fallback
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  console.log('Sending OTP email to:', email);
  const { subject, html, text } = buildEmailContent(otp, purpose);

  const sentByResend = await sendOTPViaResend(email, subject, html, text);
  if (sentByResend) return true;

  return sendOTPViaSmtp(email, subject, html, text);
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
