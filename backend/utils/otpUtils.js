// Brevo API setup (uses HTTPS, no SMTP ports blocked by hosting providers)
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

// Generate random OTP (6 digits)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate OTP expiry (10 minutes from now)
const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

// Send OTP via email using Brevo API
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  console.log('Sending OTP email to:', email);

  if (!BREVO_API_KEY || !FROM_EMAIL) {
    console.error('❌ Brevo not configured: missing BREVO_API_KEY or FROM_EMAIL');
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

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL },
        to: [{ email }],
        subject,
        htmlContent
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Brevo API error:', error);
      return false;
    }

    const data = await response.json();
    console.log('✅ Email sent successfully:', data?.messageId || data);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error?.message || error);
    return false;
  }
};

// Verify OTP
const verifyOTP = (storedOTP, providedOTP, otpExpiry) => {
  if (!storedOTP || !providedOTP) {
    return { valid: false, message: 'OTP not found' };
  }
  
  if (new Date() > otpExpiry) {
    return { valid: false, message: 'OTP has expired' };
  }
  
  if (storedOTP !== providedOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  getOTPExpiry,
  sendOTPEmail,
  verifyOTP
};
