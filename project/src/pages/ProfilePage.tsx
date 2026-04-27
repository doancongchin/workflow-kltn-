import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Mail, Calendar, MapPin, Lock, User, 
  Save, AlertCircle, CheckCircle, Loader2, 
  Workflow, Play, Clock, History, ChevronRight,
  Plug, Settings, ExternalLink, Trash2, LogIn,
  UserCircle, Shield, Activity, Link2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; 
import { XCircle } from 'lucide-react';

interface UserProfile {
  FullName: string;
  Email: string;
  BirthDate: string | null;
  UserAddress: string | null;
  AvatarUrl?: string | null;
}

interface WorkflowSummary {
  WorkflowId: number;
  WorkflowName: string;
  LastRun: string | null;
  RunCount: number;
}

interface Tool {
  ToolId: number;
  ToolName: string;
  DisplayName: string;
  Description: string;
  AuthType: string;
  IsConnected: boolean;
}

interface ProfilePageProps {
  isAuthenticated: boolean;
}

export default function ProfilePage({ isAuthenticated }: ProfilePageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity' | 'integrations'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [showToolModal, setShowToolModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolConfig, setToolConfig] = useState({
    clientId: '',
    clientSecret: '',
    authUrl: '',
    tokenUrl: '',
    scope: ''
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    address: '',
    birthDate: '',
    password: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'oauth') {
        if (data.success) {
          toast.success(`Kết nối ${data.toolName || 'tool'} thành công!`);
          fetchTools(); 
        } else {
          toast.error(`Kết nối thất bại: ${data.error || 'Lỗi không xác định'}`);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getAvatarUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('/uploads/')) {
      return `http://localhost:3001${url}`;
    }
    return url;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');

      const profileRes = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!profileRes.ok) throw new Error('Failed to fetch profile');
      const profileData = await profileRes.json();
      setProfile(profileData);
      setFormData({
        fullName: profileData.FullName || '',
        email: profileData.Email || '',
        address: profileData.UserAddress || '',
        birthDate: profileData.BirthDate ? new Date(profileData.BirthDate).toISOString().split('T')[0] : '',
        password: '',
        confirmPassword: ''
      });

      const workflowsRes = await fetch('/api/user/workflows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (workflowsRes.ok) {
        const workflowsData = await workflowsRes.json();
        const transformed = workflowsData.map((wf: any) => ({
          WorkflowId: wf.WorkflowId,
          WorkflowName: wf.WorkflowName,
          LastRun: wf.lastRunAt,
          RunCount: wf.totalRuns || 0
        }));
        setWorkflows(transformed);
      }

      setAvatarPreview(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTools = async () => {
    setLoadingTools(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/tools', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTools(data);
      }
    } catch (err) {
      console.error('Lỗi lấy tools:', err);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'integrations' && isAuthenticated) {
      fetchTools();
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const validateForm = () => {
    const errors = { fullName: '', email: '', password: '', confirmPassword: '' };
    let isValid = true;

    if (!formData.fullName.trim()) {
      errors.fullName = 'Họ tên không được để trống';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Email không hợp lệ';
      isValid = false;
    }

    if (activeTab === 'security' && formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        isValid = false;
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          birthDate: formData.birthDate || null,
          address: formData.address || null,
          password: formData.password || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Cập nhật thông tin thành công!');
        fetchProfile();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      setError('Không thể kết nối đến server');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    const uploadData = new FormData();
    uploadData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      if (response.ok) {
        setSuccessMessage('Đã cập nhật ảnh đại diện!');
        fetchProfile();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Tải ảnh lên thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối khi tải ảnh');
    }
  };

  const handleConnectTool = (toolName: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Bạn chưa đăng nhập');
      return;
    }

    setShowToolModal(false);

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      `http://localhost:3001/api/auth/${toolName}?token=${encodeURIComponent(token)}`,
      'oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const handleDisconnectTool = async (toolId: number) => {
    if (!confirm('Bạn có chắc muốn ngắt kết nối?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/tool/${toolId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Đã ngắt kết nối');
        fetchTools();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Lỗi ngắt kết nối');
      }
    } catch (err) {
      toast.error('Lỗi ngắt kết nối');
    }
  };

  const handleConfigureTool = (tool: Tool) => {
    setSelectedTool(tool);
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/user/tool-config/${tool.ToolId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setToolConfig({
              clientId: data.ClientId || '',
              clientSecret: '',
              authUrl: data.AuthUrl || '',
              tokenUrl: data.TokenUrl || '',
              scope: data.Scope || ''
            });
          } else {
            setToolConfig({
              clientId: '',
              clientSecret: '',
              authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
              tokenUrl: 'https://oauth2.googleapis.com/token',
              scope: tool.ToolName === 'gmail'
                ? 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly'
                : 'https://www.googleapis.com/auth/spreadsheets'
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfig();
    setShowToolModal(true);
  };

  const handleSaveToolConfig = async () => {
    if (!selectedTool) return;
    setSavingConfig(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        toolId: selectedTool.ToolId,
        clientId: toolConfig.clientId,
        authUrl: toolConfig.authUrl,
        tokenUrl: toolConfig.tokenUrl,
        scope: toolConfig.scope
      };
      if (toolConfig.clientSecret.trim() !== '') {
        payload.clientSecret = toolConfig.clientSecret;
      }
      const res = await fetch('/api/user/tool-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Cấu hình đã được lưu!');
        setShowToolModal(false);
        fetchTools();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Lỗi lưu cấu hình');
      }
    } catch (err) {
      toast.error('Không thể kết nối server');
    } finally {
      setSavingConfig(false);
    }
  };

  const profileCompletion = () => {
    let completed = 0;
    if (profile?.FullName) completed += 25;
    if (profile?.Email) completed += 25;
    if (profile?.BirthDate) completed += 25;
    if (profile?.UserAddress || profile?.AvatarUrl) completed += 25;
    return completed;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <LogIn className="w-16 h-16 text-[#2b5bee] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Bạn chưa đăng nhập</h2>
          <p className="text-slate-600 mb-6">Vui lòng đăng nhập để xem thông tin cá nhân và quản lý tài khoản.</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-[#2b5bee] text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Đăng nhập / Đăng ký
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="animate-spin text-[#2b5bee]" size={48} />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops!</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const avatarDisplay = avatarPreview || getAvatarUrl(profile?.AvatarUrl);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Tài khoản của tôi
          </h1>
          <p className="text-slate-500 mt-1">Quản lý thông tin và kết nối các dịch vụ</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden backdrop-blur-sm"
        >
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="relative group">
                <div
                  className="w-28 h-28 rounded-full bg-slate-100 bg-cover bg-center cursor-pointer transition-all group-hover:scale-105 ring-4 ring-white shadow-lg"
                  style={{
                    backgroundImage: `url('${avatarDisplay || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.FullName || 'User'}`}')`
                  }}
                  onClick={handleAvatarClick}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <button
                  onClick={handleAvatarClick}
                  className="absolute bottom-1 right-1 p-1.5 bg-[#2b5bee] text-white rounded-full shadow-lg border-2 border-white hover:bg-blue-600 transition-colors"
                >
                  <Camera size={14} />
                </button>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-slate-800">{profile?.FullName || 'User'}</h2>
                <p className="text-slate-500 flex items-center justify-center md:justify-start gap-1 mt-1">
                  <Mail size={14} />
                  {profile?.Email}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
                  {profile?.BirthDate && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">
                      <Calendar size={14} />
                      {new Date(profile.BirthDate).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                  {profile?.UserAddress && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">
                      <MapPin size={14} />
                      {profile.UserAddress}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Workflow size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{workflows.length}</p>
                <p className="text-sm text-slate-500">Workflows đã tạo</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <Play size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {workflows.reduce((acc, w) => acc + w.RunCount, 0)}
                </p>
                <p className="text-sm text-slate-500">Tổng số lần chạy</p>
              </div>
            </div>
          </div>

          <div className="flex border-b border-slate-200 px-6 pt-4">
            {[
              { id: 'profile', label: 'Hồ sơ', icon: User },
              { id: 'security', label: 'Bảo mật', icon: Shield },
              { id: 'activity', label: 'Hoạt động', icon: Activity },
              { id: 'integrations', label: 'Kết nối', icon: Link2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-4 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#2b5bee]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </div>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2b5bee]"
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 pt-4"
              >
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-700 text-sm">
                  <CheckCircle size={16} />
                  <span>{successMessage}</span>
                </div>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 pt-4"
              >
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-700 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                      <input
                        className={`w-full px-4 py-2.5 rounded-xl border ${
                          formErrors.fullName ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-[#2b5bee]/20'
                        } bg-white focus:outline-none focus:ring-2 focus:border-transparent transition`}
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                      {formErrors.fullName && <p className="text-xs text-rose-500 mt-1">{formErrors.fullName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        className={`w-full px-4 py-2.5 rounded-xl border ${
                          formErrors.email ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-[#2b5bee]/20'
                        } bg-white focus:outline-none focus:ring-2 focus:border-transparent transition`}
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                      {formErrors.email && <p className="text-xs text-rose-500 mt-1">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                      <input
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b5bee]/20 focus:outline-none focus:border-transparent transition"
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label>
                      <input
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b5bee]/20 focus:outline-none focus:border-transparent transition"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                      <input
                        className={`w-full px-4 py-2.5 rounded-xl border ${
                          formErrors.password ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-[#2b5bee]/20'
                        } bg-white focus:outline-none focus:ring-2 focus:border-transparent transition`}
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      {formErrors.password && <p className="text-xs text-rose-500 mt-1">{formErrors.password}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu</label>
                      <input
                        className={`w-full px-4 py-2.5 rounded-xl border ${
                          formErrors.confirmPassword ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-[#2b5bee]/20'
                        } bg-white focus:outline-none focus:ring-2 focus:border-transparent transition`}
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                      {formErrors.confirmPassword && <p className="text-xs text-rose-500 mt-1">{formErrors.confirmPassword}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 italic">Để trống nếu không muốn thay đổi mật khẩu.</p>
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-[#2b5bee]" />
                    Workflow gần đây
                  </h3>
                  {workflows.length === 0 ? (
                    <p className="text-slate-500 italic">Chưa có workflow nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {workflows.slice(0, 5).map((wf) => (
                        <div
                          key={wf.WorkflowId}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                          onClick={() => navigate(`/builder?workflowId=${wf.WorkflowId}`)}
                        >
                          <div>
                            <p className="font-medium text-slate-800">{wf.WorkflowName}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1"><Play size={12} /> {wf.RunCount} lần chạy</span>
                              {wf.LastRun && (
                                <span className="flex items-center gap-1"><Clock size={12} /> Lần cuối: {new Date(wf.LastRun).toLocaleString('vi-VN')}</span>
                              )}
                            </p>
                          </div>
                          <ChevronRight size={18} className="text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'integrations' && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Link2 size={20} className="text-[#2b5bee]" />
                    Kết nối dịch vụ
                  </h3>
                  {loadingTools ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-[#2b5bee]" size={32} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tools.map((tool) => (
                        <div
                          key={tool.ToolId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${tool.IsConnected ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center`}>
                              <Plug size={20} className={tool.IsConnected ? 'text-emerald-600' : 'text-slate-500'} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{tool.DisplayName}</p>
                              <p className="text-xs text-slate-500">{tool.Description}</p>
                              {tool.IsConnected ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-1">
                                  <CheckCircle size={12} />
                                  Đã kết nối
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-1">
                                  <XCircle size={12} />
                                  Chưa kết nối
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 sm:mt-0">
                            <button
                              onClick={() => handleConfigureTool(tool)}
                              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                              title="Cấu hình"
                            >
                              <Settings size={18} />
                            </button>
                            {tool.IsConnected ? (
                              <button
                                onClick={() => handleDisconnectTool(tool.ToolId)}
                                className="px-4 py-1.5 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
                              >
                                Ngắt kết nối
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnectTool(tool.ToolName)}
                                className="px-4 py-1.5 text-sm font-medium text-white bg-[#2b5bee] rounded-lg hover:bg-blue-600 transition"
                              >
                                Kết nối
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {tools.length === 0 && (
                        <p className="text-slate-500 italic">Không có dịch vụ nào.</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {(activeTab === 'profile' || activeTab === 'security') && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#2b5bee] hover:bg-blue-600 text-white font-medium rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {showToolModal && selectedTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Cấu hình {selectedTool.DisplayName}</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-slate-500">
                Nhập thông tin ứng dụng Google của bạn. Bạn có thể tạo ứng dụng tại{' '}
                <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#2b5bee] underline">Google Cloud Console</a>.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700">Client ID</label>
                <input
                  type="text"
                  value={toolConfig.clientId}
                  onChange={(e) => setToolConfig({ ...toolConfig, clientId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2b5bee] outline-none"
                  placeholder="Nhập Client ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Client Secret</label>
                <input
                  type="password"
                  value={toolConfig.clientSecret}
                  onChange={(e) => setToolConfig({ ...toolConfig, clientSecret: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2b5bee] outline-none"
                  placeholder="Nhập Client Secret (chỉ nhập nếu muốn thay đổi)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Auth URL</label>
                <input
                  type="text"
                  value={toolConfig.authUrl}
                  onChange={(e) => setToolConfig({ ...toolConfig, authUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2b5bee] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Token URL</label>
                <input
                  type="text"
                  value={toolConfig.tokenUrl}
                  onChange={(e) => setToolConfig({ ...toolConfig, tokenUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2b5bee] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Scope</label>
                <input
                  type="text"
                  value={toolConfig.scope}
                  onChange={(e) => setToolConfig({ ...toolConfig, scope: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2b5bee] outline-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowToolModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveToolConfig}
                disabled={savingConfig}
                className="px-6 py-2 bg-[#2b5bee] text-white rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-50"
              >
                {savingConfig ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}