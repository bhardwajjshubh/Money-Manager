import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await signup(name, email, password);
      if (response?.success) {
        setSuccessMessage(response.message || 'Verification email sent. Please verify and then log in.');
      } else {
        setError(response?.message || 'Signup failed');
      }
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white border-opacity-20">
          <h2 className="text-3xl font-bold text-white text-center mb-2">Create Account</h2>
          <p className="text-blue-100 text-center mb-8">Sign up and verify your email to start using Money Manager</p>

          <form onSubmit={handleSignup}>
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
              <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-500 bg-opacity-20 border border-green-400 rounded-lg text-green-200 text-sm">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login', { state: { accountCreated: !!successMessage } })}
              className="w-full mt-4 py-2 text-blue-200 hover:text-blue-100 font-semibold transition"
            >
              Already have an account? Sign in
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white border-opacity-10">
            <p className="text-xs text-blue-200 text-center">
              🔒 Verification is handled by Firebase Authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
