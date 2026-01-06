import React, { useState, useEffect, useRef } from 'react';

const OtpVerification = ({ email, purpose = 'signup', onVerifySuccess, onResendOTP, onBack }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120); // 2 minutes before resend
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = purpose === 'signup' ? '/auth/signup-verify-otp' : '/auth/forgot-password-verify-otp';
      const response = await fetch(`http://localhost:4000/api/v1${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: otpCode,
          ...(purpose === 'signup' && { name: window.userData?.name, password: window.userData?.password })
        }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        onVerifySuccess(data);
      } else {
        setError(data.message || 'OTP verification failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setTimer(120);
    setOtp(['', '', '', '', '', '']);
    setError('');
    await onResendOTP();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white border-opacity-20">
          <h2 className="text-3xl font-bold text-white text-center mb-2">Verify Email</h2>
          <p className="text-blue-100 text-center mb-6">Enter the 6-digit code sent to</p>
          <p className="text-white font-semibold text-center mb-8">{email}</p>

          <form onSubmit={handleVerifyOtp}>
            {/* OTP Input Fields */}
            <div className="flex gap-3 justify-center mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-2xl font-bold text-white bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg focus:border-blue-400 focus:outline-none focus:bg-opacity-20 transition"
                  placeholder="•"
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Timer */}
            <div className="text-center mb-6">
              {!canResend ? (
                <p className="text-blue-100 text-sm">
                  Resend code in <span className="font-bold text-white">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-blue-300 hover:text-blue-100 text-sm font-semibold transition"
                >
                  Resend Code
                </button>
              )}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={onBack}
              className="w-full mt-4 py-2 text-blue-200 hover:text-blue-100 font-semibold transition"
            >
              ← Back
            </button>
          </form>

          {/* Security message */}
          <div className="mt-6 pt-4 border-t border-white border-opacity-10">
            <p className="text-xs text-blue-200 text-center">
              🔒 Your data is secure. OTP expires in 10 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
