import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgetPassword from './pages/ForgetPassword';
import Layout from './components/Layout';

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Income = lazy(() => import('./pages/Income'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Categories = lazy(() => import('./pages/Categories'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Savings = lazy(() => import('./pages/Savings'));
const Loans = lazy(() => import('./pages/Loans'));
const Profile = lazy(() => import('./pages/Profile'));
const FAQ = lazy(() => import('./pages/FAQ'));

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgetPassword />} />
            
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Dashboard />
                </Suspense>
              } />
              <Route path="income" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Income />
                </Suspense>
              } />
              <Route path="expenses" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Expenses />
                </Suspense>
              } />
              <Route path="categories" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Categories />
                </Suspense>
              } />
              <Route path="budgets" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Budgets />
                </Suspense>
              } />
              <Route path="savings" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Savings />
                </Suspense>
              } />
              <Route path="loans" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Loans />
                </Suspense>
              } />
              <Route path="profile" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Profile />
                </Suspense>
              } />
              <Route path="faq" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <FAQ />
                </Suspense>
              } />
            </Route>
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
