// src/pages/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Layout, BarChart3, UserPlus, Edit, Trash2, Lock, Unlock, Key, Plus,
  Workflow, X, AlertTriangle, Eye, EyeOff, MessageSquare, Bot, User, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface User {
  UserId: number;
  FullName: string;
  Email: string;
  Role: string;
  IsActive: boolean;
  CreatedAt: string;
  WorkflowCount: number;
}

interface Template {
  TemplateId: number;
  Title: string;
  Description: string;
  Status: string;
  Steps: number;
  ImageUrl: string | null;
  Category: string | null;
  CreatedAt: string;
}

interface WorkflowItem {
  WorkflowId: number;
  WorkflowName: string;
  Description: string;
  UserId: number;
  FullName: string;
  Email: string;
  ExecutionCount: number;
  CreatedAt: string;
}

interface Stats {
  totalUsers: number;
  totalWorkflows: number;
  totalExecutions: number;
  topUsers: { UserId: number; FullName: string; Email: string; WorkflowCount: number }[];
}

interface ChatUser {
  UserId: number;
  FullName: string;
  Email: string;
  SessionCount: number;
  LastActivity: string;
}

interface ChatSession {
  SessionId: string;
  Title: string;
  Description: string;
  Model: string;
  MessageCount: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'templates' | 'stats' | 'workflows' | 'chats'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Workflows specific pagination
  const [workflowPage, setWorkflowPage] = useState(1);
  const [workflowTotalPages, setWorkflowTotalPages] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Chat specific state
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<number | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loadingChatUsers, setLoadingChatUsers] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: '', role: 'user', isActive: true });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning';
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Xác nhận',
    onConfirm: () => {},
  });

  // Reset password modal
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    userId: number | null;
    userName: string;
    newPassword: string;
    showPassword: boolean;
  }>({
    isOpen: false,
    userId: null,
    userName: '',
    newPassword: '',
    showPassword: false,
  });

  const navigate = useNavigate();

  // ---------- Users ----------
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users?page=${page}&search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(Math.ceil(data.total / 10));
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.IsActive ? 0 : 1;
    const action = user.IsActive ? 'khóa' : 'mở khóa';
    setConfirmModal({
      isOpen: true,
      title: `${user.IsActive ? 'Khóa' : 'Mở khóa'} tài khoản`,
      message: `Bạn có chắc chắn muốn ${action} tài khoản của "${user.FullName}"?`,
      type: 'warning',
      confirmText: user.IsActive ? 'Khóa' : 'Mở khóa',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/admin/users/${user.UserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              fullName: user.FullName,
              email: user.Email,
              role: user.Role,
              isActive: newStatus
            })
          });
          if (res.ok) {
            toast.success(`Đã ${action} tài khoản "${user.FullName}"`);
            fetchUsers();
          } else {
            toast.error('Cập nhật thất bại');
          }
        } catch (err) {
          toast.error('Lỗi kết nối');
        }
      }
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(userForm)
      });
      if (res.ok) {
        toast.success('Thêm người dùng thành công');
        setShowUserModal(false);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Thêm thất bại');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${editingUser.UserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: userForm.fullName,
          email: userForm.email,
          role: userForm.role,
          isActive: userForm.isActive
        })
      });
      if (res.ok) {
        toast.success('Cập nhật người dùng thành công');
        setShowUserModal(false);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa người dùng',
      message: `Bạn có chắc chắn muốn xóa người dùng "${userName}"? Toàn bộ workflows, nodes, executions của người dùng này sẽ bị xóa vĩnh viễn.`,
      type: 'danger',
      confirmText: 'Xóa vĩnh viễn',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            toast.success(`Đã xóa người dùng "${userName}"`);
            fetchUsers();
          } else {
            toast.error('Xóa thất bại');
          }
        } catch (err) {
          toast.error('Lỗi kết nối');
        }
      }
    });
  };

  const handleResetPassword = (userId: number, userName: string) => {
    setResetPasswordModal({
      isOpen: true,
      userId,
      userName,
      newPassword: '',
      showPassword: false,
    });
  };

  const submitResetPassword = async () => {
    if (!resetPasswordModal.userId) return;
    if (!resetPasswordModal.newPassword || resetPasswordModal.newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${resetPasswordModal.userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: resetPasswordModal.newPassword })
      });
      if (res.ok) {
        toast.success(`Đã đặt lại mật khẩu cho "${resetPasswordModal.userName}"`);
        setResetPasswordModal({ isOpen: false, userId: null, userName: '', newPassword: '', showPassword: false });
      } else {
        const err = await res.json();
        toast.error(err.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    }
  };

  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        fullName: user.FullName,
        email: user.Email,
        password: '',
        role: user.Role,
        isActive: user.IsActive
      });
    } else {
      setEditingUser(null);
      setUserForm({ fullName: '', email: '', password: '', role: 'user', isActive: true });
    }
    setShowUserModal(true);
  };

  // ---------- Templates ----------
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/templates?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
        setTotalPages(Math.ceil(data.total / 10));
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa template',
      message: `Bạn có chắc muốn xóa template "${title}"? Hành động này không thể hoàn tác.`,
      type: 'danger',
      confirmText: 'Xóa',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/admin/templates/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            toast.success(`Đã xóa template "${title}"`);
            fetchTemplates();
          } else {
            toast.error('Xóa thất bại');
          }
        } catch (err) {
          toast.error('Lỗi kết nối');
        }
      }
    });
  };

  const handleEditTemplate = (templateId: number) => {
    navigate(`/builder?editTemplateId=${templateId}`);
  };

  // ---------- Workflows ----------
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/admin/workflows?page=${workflowPage}&limit=10`;
      if (selectedUserId) url += `&userId=${selectedUserId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows);
        setWorkflowTotalPages(Math.ceil(data.total / 10));
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId: number, workflowName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa workflow',
      message: `Bạn có chắc muốn xóa workflow "${workflowName}"? Toàn bộ nodes, edges và lịch sử chạy sẽ bị xóa.`,
      type: 'danger',
      confirmText: 'Xóa',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/admin/workflows/${workflowId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            toast.success(`Đã xóa workflow "${workflowName}"`);
            fetchWorkflows();
          } else {
            toast.error('Xóa thất bại');
          }
        } catch (err) {
          toast.error('Lỗi kết nối');
        }
      }
    });
  };

  // ---------- Stats ----------
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải thống kê');
    }
  };

  // ---------- Chat ----------
  const fetchChatUsers = async () => {
    setLoadingChatUsers(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/chat/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setChatUsers(data);
      } else {
        toast.error('Không thể tải danh sách người dùng chat');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    } finally {
      setLoadingChatUsers(false);
    }
  };

  const fetchChatSessions = async (userId: number) => {
    setLoadingSessions(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/chat/sessions/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data);
      } else {
        toast.error('Không thể tải danh sách cuộc trò chuyện');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    } finally {
      setLoadingSessions(false);
    }
  };

  const deleteChatSession = async (sessionId: string, sessionTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa cuộc trò chuyện',
      message: `Bạn có chắc muốn xóa cuộc trò chuyện "${sessionTitle}"? Hành động này không thể hoàn tác.`,
      type: 'danger',
      confirmText: 'Xóa',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setDeletingSessionId(sessionId);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/admin/chat/sessions/${sessionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            toast.success('Đã xóa cuộc trò chuyện');
            if (selectedChatUserId) fetchChatSessions(selectedChatUserId);
            fetchChatUsers();
          } else {
            toast.error('Xóa thất bại');
          }
        } catch (err) {
          toast.error('Lỗi kết nối');
        } finally {
          setDeletingSessionId(null);
        }
      }
    });
  };

  useEffect(() => {
    if (selectedChatUserId) {
      fetchChatSessions(selectedChatUserId);
    } else {
      setChatSessions([]);
    }
  }, [selectedChatUserId]);

  useEffect(() => {
    if (activeTab === 'chats') {
      fetchChatUsers();
    }
  }, [activeTab]);

  // ---------- Effects ----------
  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'templates') fetchTemplates();
    if (activeTab === 'stats') fetchStats();
    if (activeTab === 'workflows') {
      fetchWorkflows();
      if (users.length === 0) fetchUsers();
    }
  }, [activeTab, page, search, workflowPage, selectedUserId]);

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-slate-800 mb-6">Quản trị hệ thống</h1>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 mb-8 flex-wrap">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'users' ? 'text-[#2b5bee] border-b-2 border-[#2b5bee]' : 'text-slate-500'}`}
          >
            <Users size={18} /> Người dùng
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'templates' ? 'text-[#2b5bee] border-b-2 border-[#2b5bee]' : 'text-slate-500'}`}
          >
            <Layout size={18} /> Mẫu
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'workflows' ? 'text-[#2b5bee] border-b-2 border-[#2b5bee]' : 'text-slate-500'}`}
          >
            <Workflow size={18} /> Workflows
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'stats' ? 'text-[#2b5bee] border-b-2 border-[#2b5bee]' : 'text-slate-500'}`}
          >
            <BarChart3 size={18} /> Thống kê
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'chats' ? 'text-[#2b5bee] border-b-2 border-[#2b5bee]' : 'text-slate-500'}`}
          >
            <MessageSquare size={18} /> Chats
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <input
                type="text"
                placeholder="Tìm kiếm user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border rounded-lg w-64"
              />
              <button onClick={() => openUserModal()} className="bg-[#2b5bee] text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <UserPlus size={18} /> Thêm user
              </button>
            </div>
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold">ID</th>
                    <th className="px-6 py-3 text-xs font-semibold">Tên</th>
                    <th className="px-6 py-3 text-xs font-semibold">Email</th>
                    <th className="px-6 py-3 text-xs font-semibold">Role</th>
                    <th className="px-6 py-3 text-xs font-semibold">Số WF</th>
                    <th className="px-6 py-3 text-xs font-semibold">Trạng thái</th>
                    <th className="px-6 py-3 text-xs font-semibold">Hành động</th>
                   </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.UserId} className="border-t">
                      <td className="px-6 py-4 text-sm">{user.UserId}</td>
                      <td className="px-6 py-4 text-sm font-medium">{user.FullName}</td>
                      <td className="px-6 py-4 text-sm">{user.Email}</td>
                      <td className="px-6 py-4 text-sm capitalize">{user.Role}</td>
                      <td className="px-6 py-4 text-sm">{user.WorkflowCount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.IsActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.IsActive ? 'Hoạt động' : 'Khóa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                        <button onClick={() => openUserModal(user)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteUser(user.UserId, user.FullName)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                        <button onClick={() => handleResetPassword(user.UserId, user.FullName)} className="text-amber-600 hover:text-amber-800"><Key size={16} /></button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={user.IsActive ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}
                          title={user.IsActive ? 'Khóa tài khoản' : 'Mở khóa'}
                        >
                          {user.IsActive ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-6 gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded ${page === p ? 'bg-[#2b5bee] text-white' : 'bg-white border'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div>
            <div className="flex justify-end mb-6">
              <button
                onClick={() => navigate('/builder?newTemplate=true')}
                className="bg-[#2b5bee] text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus size={18} /> Thêm mẫu
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(tpl => (
                <div key={tpl.TemplateId} className="bg-white rounded-xl shadow p-4">
                  <img src={tpl.ImageUrl || 'https://via.placeholder.com/300'} className="w-full h-32 object-cover rounded-lg mb-3" />
                  <h3 className="font-bold text-lg">{tpl.Title}</h3>
                  <p className="text-sm text-slate-500 truncate">{tpl.Description}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">{tpl.Status}</span>
                    <div className="space-x-2">
                      <button onClick={() => handleEditTemplate(tpl.TemplateId)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteTemplate(tpl.TemplateId, tpl.Title)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="">Tất cả người dùng</option>
                {users.map(user => (
                  <option key={user.UserId} value={user.UserId}>{user.FullName} ({user.Email})</option>
                ))}
              </select>
            </div>
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold">ID</th>
                    <th className="px-6 py-3 text-xs font-semibold">Tên workflow</th>
                    <th className="px-6 py-3 text-xs font-semibold">Người tạo</th>
                    <th className="px-6 py-3 text-xs font-semibold">Số lần chạy</th>
                    <th className="px-6 py-3 text-xs font-semibold">Ngày tạo</th>
                    <th className="px-6 py-3 text-xs font-semibold">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map(wf => (
                    <tr key={wf.WorkflowId} className="border-t">
                      <td className="px-6 py-4 text-sm">{wf.WorkflowId}</td>
                      <td className="px-6 py-4 text-sm font-medium">{wf.WorkflowName}</td>
                      <td className="px-6 py-4 text-sm">{wf.FullName} ({wf.Email})</td>
                      <td className="px-6 py-4 text-sm">{wf.ExecutionCount}</td>
                      <td className="px-6 py-4 text-sm">{new Date(wf.CreatedAt).toLocaleDateString('vi-VN')}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleDeleteWorkflow(wf.WorkflowId, wf.WorkflowName)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-6 gap-2">
              {Array.from({ length: workflowTotalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setWorkflowPage(p)} className={`px-3 py-1 rounded ${workflowPage === p ? 'bg-[#2b5bee] text-white' : 'bg-white border'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow text-center">
              <div className="text-4xl font-bold text-[#2b5bee]">{stats.totalUsers}</div>
              <div className="text-slate-500">Người dùng</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow text-center">
              <div className="text-4xl font-bold text-[#2b5bee]">{stats.totalWorkflows}</div>
              <div className="text-slate-500">Workflows</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow text-center">
              <div className="text-4xl font-bold text-[#2b5bee]">{stats.totalExecutions}</div>
              <div className="text-slate-500">Lần chạy</div>
            </div>
            <div className="md:col-span-3 bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg mb-4">Top người dùng tạo workflow nhiều nhất</h3>
              <table className="w-full">
                <thead>
                  <tr><th>Tên</th><th>Email</th><th>Số workflow</th></tr>
                </thead>
                <tbody>
                  {stats.topUsers.map(user => (
                    <tr key={user.UserId}>
                      <td className="py-2">{user.FullName}</td>
                      <td className="py-2">{user.Email}</td>
                      <td className="py-2">{user.WorkflowCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Chats Tab */}
        {activeTab === 'chats' && (
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Chọn người dùng</label>
              <select
                value={selectedChatUserId || ''}
                onChange={(e) => setSelectedChatUserId(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 border rounded-lg w-80"
                disabled={loadingChatUsers}
              >
                <option value="">-- Chọn người dùng --</option>
                {chatUsers.map(user => (
                  <option key={user.UserId} value={user.UserId}>
                    {user.FullName} ({user.Email}) - {user.SessionCount} cuộc trò chuyện
                  </option>
                ))}
              </select>
            </div>

           {selectedChatUserId && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800">Danh sách cuộc trò chuyện</h3>
              </div>
              <div className="overflow-x-auto">
                {loadingSessions ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-[#2b5bee]" size={32} />
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">Người dùng chưa có cuộc trò chuyện nào</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-semibold">Tiêu đề</th>
                        <th className="px-6 py-3 text-xs font-semibold">Mô tả</th>
                        <th className="px-6 py-3 text-xs font-semibold">Model</th>
                        <th className="px-6 py-3 text-xs font-semibold">Cập nhật lần cuối</th>
                        <th className="px-6 py-3 text-xs font-semibold">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chatSessions.map(session => (
                        <tr key={session.SessionId} className="border-t">
                          <td className="px-6 py-4 text-sm font-medium">{session.Title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{session.Description || '—'}</td>
                          <td className="px-6 py-4 text-sm">{session.Model}</td>
                          <td className="px-6 py-4 text-sm">{new Date(session.UpdatedAt).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => deleteChatSession(session.SessionId, session.Title)}
                              disabled={deletingSessionId === session.SessionId}
                              className="text-rose-500 hover:text-rose-700 disabled:opacity-50"
                            >
                              {deletingSessionId === session.SessionId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Modal User (Thêm/Sửa) */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{editingUser ? 'Sửa user' : 'Thêm user'}</h2>
                <button onClick={() => setShowUserModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                  <input type="text" placeholder="Họ tên" value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} className="w-full border p-2 rounded mb-2" required />
                  <input type="email" placeholder="Email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full border p-2 rounded mb-2" required />
                  {!editingUser && <input type="password" placeholder="Mật khẩu" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full border p-2 rounded mb-2" required />}
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full border p-2 rounded mb-2">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="flex items-center gap-2 mb-4">
                    <input type="checkbox" checked={userForm.isActive} onChange={e => setUserForm({ ...userForm, isActive: e.target.checked })} />
                    <label>Kích hoạt</label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 border rounded-lg">Hủy</button>
                    <button type="submit" className="px-4 py-2 bg-[#2b5bee] text-white rounded-lg font-semibold">Lưu</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal (Xóa, Khóa/Mở khóa) */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${confirmModal.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    <AlertTriangle size={24} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{confirmModal.title}</h2>
                </div>
                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="p-1 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-600">{confirmModal.message}</p>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Hủy</button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    confirmModal.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20'
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetPasswordModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Đặt lại mật khẩu</h2>
                <button onClick={() => setResetPasswordModal({ ...resetPasswordModal, isOpen: false })} className="p-1 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-600 mb-4">Nhập mật khẩu mới cho <strong>{resetPasswordModal.userName}</strong></p>
                <div className="relative">
                  <input
                    type={resetPasswordModal.showPassword ? 'text' : 'password'}
                    value={resetPasswordModal.newPassword}
                    onChange={(e) => setResetPasswordModal({ ...resetPasswordModal, newPassword: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setResetPasswordModal({ ...resetPasswordModal, showPassword: !resetPasswordModal.showPassword })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {resetPasswordModal.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setResetPasswordModal({ ...resetPasswordModal, isOpen: false })} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Hủy</button>
                <button
                  onClick={submitResetPassword}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/20"
                >
                  Đặt lại
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}