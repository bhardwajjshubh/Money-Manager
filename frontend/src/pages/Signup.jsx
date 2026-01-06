import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OtpVerification from './OtpVerification';

export default function Signup() {
  const [step, setStep] = useState(1); // 1: signup form, 2: OTP verification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const navigate = useNavigate();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/signup-request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        // Store signup data temporarily
        window.userData = { name, email, password };
        setStep(2);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerifySuccess = (data) => {
    // Clean up stored data
    delete window.userData;
    // Show success popup
    setShowSuccessPopup(true);
    // Navigate to login after 2 seconds with success state
    setTimeout(() => {
      navigate('/login', { state: { accountCreated: true } });
    }, 2000);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/signup-request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Signup Form
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Floating blobs */}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white border-opacity-20">
            <h2 className="text-3xl font-bold text-white text-center mb-2">Create Account</h2>
            <p className="text-blue-100 text-center mb-8">Join Money Manager and start tracking your finances</p>

            <form onSubmit={handleRequestOTP}>
              {/* Name Input */}
              <div className="mb-6">
                <label className="block text-blue-200 text-sm font-semibold mb-2">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xl">👤</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-200 focus:border-blue-400 focus:outline-none focus:bg-opacity-20 transition"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="mb-6">
                <label className="block text-blue-200 text-sm font-semibold mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xl">📧</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-200 focus:border-blue-400 focus:outline-none focus:bg-opacity-20 transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="mb-6">
                <label className="block text-blue-200 text-sm font-semibold mb-2">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xl">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-12 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-200 focus:border-blue-400 focus:outline-none focus:bg-opacity-20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-xl hover:scale-110 transition"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-500 bg-opacity-30 border-2 border-red-400 rounded-lg text-red-100 text-sm font-medium animate-slideIn">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p>{error}</p>
                      {error.includes('already registered') && (
                        <p className="text-xs mt-1 text-red-200">
                          Try signing up with a different email address
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending OTP...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Sign In Link */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full mt-4 py-2 text-blue-200 hover:text-blue-100 font-semibold transition"
              >
                Already have an account? Sign in
              </button>
            </form>

            {/* Security message */}
            <div className="mt-6 pt-4 border-t border-white border-opacity-10">
              <p className="text-xs text-blue-200 text-center">
                🔒 Your account will be secure. We use encryption for all data.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: OTP Verification
  return (
    <OtpVerification
      email={email}
      purpose="signup"
      onVerifySuccess={handleOTPVerifySuccess}
      onResendOTP={handleResendOTP}
      onBack={() => setStep(1)}
    />
  );
}
