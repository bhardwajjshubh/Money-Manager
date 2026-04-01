import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAccountCreatedMsg, setShowAccountCreatedMsg] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if coming from successful signup
    if (location.state?.accountCreated) {
      setShowAccountCreatedMsg(true);
      setTimeout(() => setShowAccountCreatedMsg(false), 5000);
    }
  }, [location.state?.accountCreated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white border-opacity-20">
          <h2 className="text-3xl font-bold text-white text-center mb-2">Money Manager</h2>
          <p className="text-blue-100 text-center mb-8">Smart way to track your finances</p>

          {/* Account Created Success Message */}
          {showAccountCreatedMsg && (
            <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-400 rounded-lg animate-slideIn">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <p className="text-green-200 font-semibold">Account created successfully!</p>
                  <p className="text-green-100 text-sm">You can now login with your email.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
                  placeholder="Enter your password"
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
              <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg text-red-200 text-sm">
                {error}
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
                  Signing in...
                </>
              ) : (
                'Sign in to Dashboard'
              )}
            </button>

            {/* Forgot Password Link */}
            <Link
              to="/forgot-password"
              className="block w-full mt-4 py-2 text-blue-200 hover:text-blue-100 font-semibold text-center transition"
            >
              Forgot password?
            </Link>

            {/* Sign Up Link */}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full mt-2 py-2 text-blue-200 hover:text-blue-100 font-semibold transition"
            >
              Don't have an account? Sign up
            </button>
          </form>

          {/* Security message */}
          <div className="mt-6 pt-4 border-t border-white border-opacity-10">
            <p className="text-xs text-blue-200 text-center">
              🔒 Your login is secure. We protect your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
