import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Zap, Calendar, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface AuthPageProps {
  onLogin: () => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    birthDate: '',
    address: ''
  });

  // Xử lý token từ Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const user = params.get('user');
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', user);
      onLogin();
      navigate('/');
    }
  }, [onLogin, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', data.user.role);
        onLogin();
        navigate('/');
      } else {
        setIsLogin(true);
        setError('Đăng ký thành công! Vui lòng đăng nhập.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-[#f6f6f8]">
      {/* Auth Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] bg-white rounded-xl shadow-xl shadow-blue-500/5 border border-slate-200 p-8 z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản'}</h1>
          <p className="text-slate-500">Tự động hóa công việc của bạn với các quy trình thông minh.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mb-8 p-1 bg-slate-100 rounded-lg">
          <button 
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Đăng nhập
          </button>
          <button 
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Đăng ký
          </button>
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${error.includes('thành công') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Họ và tên</label>
                <input 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#2b5bee] focus:border-transparent outline-none transition-all" 
                  placeholder="Nguyễn Văn A" 
                  type="text" 
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Ngày sinh</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#2b5bee] focus:border-transparent outline-none transition-all text-sm" 
                      type="date" 
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Địa chỉ</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#2b5bee] focus:border-transparent outline-none transition-all text-sm" 
                      placeholder="Thành phố, Quốc gia" 
                      type="text" 
                      required
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Địa chỉ email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#2b5bee] focus:border-transparent outline-none transition-all" 
                placeholder="ten@gmail.com" 
                type="email" 
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
              {isLogin && (
                <Link to="/forgot-password" className="text-xs text-[#2b5bee] hover:underline">
                  Quên mật khẩu?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#2b5bee] focus:border-transparent outline-none transition-all" 
                placeholder="••••••••" 
                type="password" 
                required
              />
            </div>
          </div>
          <button 
            disabled={isLoading}
            className="w-full bg-[#2b5bee] hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
            type="submit"
          >
            {isLoading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Tạo tài khoản')}
          </button>

        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"} 
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#2b5bee] font-semibold hover:underline ml-1"
          >
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
          </button>
        </p>
      </motion.div>

      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]"></div>
      </div>
    </div>
  );
}