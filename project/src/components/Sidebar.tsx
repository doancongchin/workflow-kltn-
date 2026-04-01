import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  PlusSquare, 
  Layout, 
  User, 
  LogOut,
  Zap,
  LogIn,
  Workflow,
  Moon,
  Sun,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '../context/ThemeContext';
import { MessageSquare } from 'lucide-react';

interface SidebarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function Sidebar({ isAuthenticated, onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const role = localStorage.getItem('role');

  const navItems = [
    { icon: Home, label: 'Trang chủ', path: '/' },                 
    { icon: PlusSquare, label: 'Tạo workflow', path: '/builder' },   
    { icon: Layout, label: 'Mẫu', path: '/templates' },             
    { icon: MessageSquare, label: 'Chatbot', path: '/chat' },        
    ...(isAuthenticated ? [
      { icon: Workflow, label: 'Workflows của tôi', path: '/workflows' }, 
      { icon: User, label: 'Hồ sơ', path: '/profile' },                  
      ...(role === 'admin' ? [{ icon: Shield, label: 'Quản trị', path: '/admin' }] : []) 
    ] : []),
  ];

  const handleLoginClick = () => {
    navigate('/auth');
  };

  const handleLogout = () => {
    onLogout();
    navigate('/'); 
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 z-50 flex flex-col transition-colors duration-200">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="h-10 w-10 rounded-lg bg-[#2b5bee] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Zap size={24} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-white text-base font-bold leading-none">
              FlowAutomate
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Tự động hóa</p> {/* Automation -> Tự động hóa */}
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-[#2b5bee] text-white shadow-md shadow-blue-500/10" 
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-[#2b5bee] dark:hover:text-[#2b5bee]"
              )}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        {/* Dark mode toggle */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg border-t border-slate-100 dark:border-gray-700 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span>Chế độ tối</span>  {/* Dark mode -> Chế độ tối */}
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            aria-label="Toggle dark mode"
          />
        </div>

        {/* Auth buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-gray-700">
          {isAuthenticated ? (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Đăng xuất</span>  {/* Logout -> Đăng xuất */}
            </button>
          ) : (
            <button 
              onClick={handleLoginClick}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[#2b5bee] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            >
              <LogIn size={20} />
              <span className="text-sm font-medium">Đăng nhập / Đăng ký</span>  {/* Đã là tiếng Việt */}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}