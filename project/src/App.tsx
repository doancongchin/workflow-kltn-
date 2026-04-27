import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import BuilderPage from './pages/BuilderPage';
import TemplatesPage from './pages/TemplatesPage';
import ProfilePage from './pages/ProfilePage';
import Sidebar from './components/Sidebar';
import MyWorkflowsPage from './pages/MyWorkflowsPage';
import { ThemeProvider } from './context/ThemeContext';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { Toaster } from 'react-hot-toast';
import ChatPage from './pages/ChatPage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8]">Loading...</div>;
  }

  return (
    <ThemeProvider>
      <Toaster position="top-right" />
          <Router>
      <div className="flex min-h-screen bg-[#f6f6f8] text-slate-900 font-sans">
        <Sidebar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <main className="flex-1 ml-64 min-h-screen relative">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/builder" element={<BuilderPage isAuthenticated={isAuthenticated}  />} />
            <Route path="/templates" element={<TemplatesPage isAuthenticated={isAuthenticated} />} />
            <Route path="/profile" element={<ProfilePage isAuthenticated={isAuthenticated} />} />
            <Route path="/chat" element={<ChatPage isAuthenticated={isAuthenticated} />} />
            <Route path="/workflows" element={<MyWorkflowsPage />} />
            <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
    </ThemeProvider>

  );
}