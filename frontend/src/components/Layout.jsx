import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  const navigation = [
    { name: 'Dashboard', path: '/' },
    { name: 'Income', path: '/income' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Categories', path: '/categories' },
    { name: 'Budgets', path: '/budgets' },
    { name: 'Savings', path: '/savings' },
    { name: 'Loans', path: '/loans' },
    { name: 'FAQ', path: '/faq' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';

    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event) => {
      const nextTheme = event?.detail?.theme;
      if (nextTheme === 'dark' || nextTheme === 'light') {
        setTheme(nextTheme);
      }
    };

    window.addEventListener('app-theme-change', handleThemeChange);
    return () => window.removeEventListener('app-theme-change', handleThemeChange);
  }, []);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Sticky Glassmorphism Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/70 backdrop-blur-lg shadow-lg dark:bg-slate-950/75 dark:shadow-black/20' 
          : 'bg-white/90 backdrop-blur-sm shadow-sm dark:bg-slate-950/90 dark:shadow-black/10'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left Section - Logo & Navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo with Gradient */}
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Money Manager
                </Link>
              </div>
              
              {/* Navigation Links with Animated Indicator - Desktop Only */}
              <div className="hidden lg:flex items-center space-x-1 relative">
                {navigation.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:-translate-y-0.5 group ${
                        active
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'
                      }`}
                    >
                      {/* Animated pill background for active tab */}
                      {active && (
                        <span className="absolute inset-0 bg-blue-50 rounded-lg -z-10 animate-slideIn dark:bg-blue-950/60"></span>
                      )}
                      
                      {/* Hover glow effect */}
                      <span className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
                      
                      {/* Text */}
                      <span>{item.name}</span>
                      
                      {/* Animated bottom indicator */}
                      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ${
                        active ? 'w-3/4' : 'w-0 group-hover:w-1/2'
                      }`}></span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Section - Mobile Menu Toggle + Profile */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-8.66h-1M4.34 12.34h-1m15.07 5.07l-.7-.7M6.34 6.34l-.7-.7m12.02 0l-.7.7M6.34 17.66l-.7.7M18 12a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a6.75 6.75 0 106.75 6.75A8.96 8.96 0 0112 3z" />
                  </svg>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors dark:hover:bg-slate-800"
              >
                <svg
                  className={`w-6 h-6 text-gray-700 transition-transform duration-300 dark:text-slate-200 ${
                    showMobileMenu ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={showMobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                  />
                </svg>
              </button>

              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-300 group dark:hover:bg-slate-800"
                >
                  {/* Avatar Circle */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow">
                    {getInitials(user?.name)}
                  </div>
                  
                  {/* User Name & Currency */}
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{user?.currency || 'INR'}</p>
                  </div>
                  
                  {/* Dropdown Arrow */}
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform duration-300 dark:text-slate-400 ${showDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 animate-slideIn dark:bg-slate-900 dark:border-slate-700 dark:shadow-black/30">
                    <Link
                      to="/profile"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                    >
                      <span className="font-medium">Profile</span>
                    </Link>
                    
                    <div className="border-t border-gray-100 my-1 dark:border-slate-700"></div>
                    
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-950/40"
                    >
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm animate-slideIn dark:border-slate-800 dark:bg-slate-950/95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-2">
              {navigation.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMobileMenu(false)}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                      active
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content with proper spacing for fixed navbar */}
      <main className="max-w-7xl mx-auto pt-28 pb-12 px-4 sm:px-6 lg:px-8 text-gray-900 transition-colors duration-300 dark:text-slate-100">
        <Outlet />
      </main>
    </div>
  );
}
