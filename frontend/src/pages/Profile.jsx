import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    currency: user?.currency || 'INR',
    theme: user?.theme || 'light'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return '';
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
    if (name === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const { data } = await api.patch('/users/me', profileData);
      setUser(data.data.user);
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (calculatePasswordStrength(passwordData.newPassword) === 'weak') {
      setError('Password is too weak. Use at least 8 characters with mix of uppercase, lowercase, numbers, and symbols');
      setLoading(false);
      return;
    }

    try {
      await api.patch('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength('');
      setMessage('Password changed successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error changing password');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, icon, type = 'text', value, onChange, disabled = false, placeholder = '' }) => (
    <div className="group">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          key={`input-${label}-${value}`}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white group-hover:border-gray-400'
          }`}
        />
      </div>
    </div>
  );

  const PasswordField = ({ label, value, onChange, showPassword, onToggleShow, name = '' }) => (
    <div className="group">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder="Enter your password"
          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-2.5 text-lg hover:scale-110 transition-transform"
        >
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>
    </div>
  );

  const StrengthIndicator = ({ strength }) => {
    if (!strength) return null;
    const colors = {
      weak: { bg: 'bg-red-200', bar: 'bg-red-500', text: 'text-red-600' },
      medium: { bg: 'bg-yellow-200', bar: 'bg-yellow-500', text: 'text-yellow-600' },
      strong: { bg: 'bg-green-200', bar: 'bg-green-500', text: 'text-green-600' }
    };
    const color = colors[strength];

    return (
      <div className="mt-2">
        <div className={`h-2 rounded-full ${color.bg} overflow-hidden`}>
          <div
            className={`h-full ${color.bar} transition-all duration-300`}
            style={{
              width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%'
            }}
          ></div>
        </div>
        <p className={`text-xs ${color.text} mt-1 capitalize`}>
          Password strength: {strength}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Profile Header Card */}
      <div className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{user?.name}</h1>
            <p className="text-gray-600 mb-4">{user?.email}</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div>
                <span className="text-sm text-gray-500">Currency</span>
                <p className="text-lg font-semibold text-gray-900">{profileData.currency}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Theme</span>
                <p className="text-lg font-semibold text-gray-900 capitalize">{profileData.theme}</p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-green-300 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-semibold text-green-600">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 border-b-2 border-gray-200">
        {[
          { id: 'profile', label: 'Profile Info' },
          { id: 'security', label: 'Security' },
          { id: 'preferences', label: 'Preferences' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-all duration-300 border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Messages */}
      {message && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg animate-slideIn">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <p className="text-green-800 font-medium">{message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-slideIn">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✕</span>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {/* Profile Info Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-8">
            <InputField
              label="Full Name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              placeholder="Enter your name"
            />

            <InputField
              label="Email Address"
              type="email"
              value={user?.email}
              disabled
              placeholder="Your email"
            />

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select
                value={profileData.currency}
                onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-8">
            <PasswordField
              label="Current Password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              showPassword={showPasswords.current}
              onToggleShow={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              name="currentPassword"
            />

            <div>
              <PasswordField
                label="New Password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                showPassword={showPasswords.new}
                onToggleShow={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                name="newPassword"
              />
              <StrengthIndicator strength={passwordStrength} />
            </div>

            <PasswordField
              label="Confirm New Password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              showPassword={showPasswords.confirm}
              onToggleShow={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              name="confirmPassword"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Updating...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Theme Preferences</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Light Theme Card */}
            <div
              onClick={() => setProfileData({ ...profileData, theme: 'light' })}
              className={`relative p-6 rounded-xl border-3 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                profileData.theme === 'light'
                  ? 'border-blue-600 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 shadow'
              }`}
            >
              {profileData.theme === 'light' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </div>
              )}
              <div className="text-4xl mb-3">☀️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Light Mode</h3>
              <p className="text-gray-600 text-sm">Clean and bright interface for daytime use</p>
              <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                <div className="text-xs text-gray-500">Preview</div>
                <div className="mt-2 flex gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Dark Theme Card */}
            <div
              onClick={() => setProfileData({ ...profileData, theme: 'dark' })}
              className={`relative p-6 rounded-xl border-3 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                profileData.theme === 'dark'
                  ? 'border-purple-600 bg-purple-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 shadow'
              }`}
            >
              {profileData.theme === 'dark' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </div>
              )}
              <div className="text-4xl mb-3">🌙</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dark Mode</h3>
              <p className="text-gray-600 text-sm">Easy on the eyes for nighttime browsing</p>
              <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
                <div className="text-xs text-gray-400">Preview</div>
                <div className="mt-2 flex gap-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleProfileSubmit}
            disabled={loading}
            className="mt-8 w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              'Save Preference'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
