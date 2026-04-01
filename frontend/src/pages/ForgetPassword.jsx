import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForgetPassword = () => {
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await requestPasswordReset(email);
      setSuccessMessage(response?.message || 'Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(err?.message || 'Failed to send password reset email');
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
          <h2 className="text-3xl font-bold text-white text-center mb-2">Forgot Password?</h2>
          <p className="text-blue-100 text-center mb-8">Enter your account email to receive a reset link</p>

          <form onSubmit={handleResetRequest}>
            <div className="mb-6">
              <label className="block text-blue-200 text-sm font-semibold mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xl">📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-200 focus:border-blue-400 focus:outline-none focus:bg-opacity-20 transition"
                />
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
              {loading ? 'Sending reset link...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full mt-4 py-2 text-blue-200 hover:text-blue-100 font-semibold transition"
            >
              ← Back to Login
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white border-opacity-10">
            <p className="text-xs text-blue-200 text-center">
              🔒 Password reset emails are handled by Firebase Authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;
