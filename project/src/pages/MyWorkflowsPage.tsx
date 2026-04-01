import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Workflow, Play, Clock, Edit3, Trash2, Loader2, 
  ChevronRight, Search, AlertCircle, X, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Workflow {
  WorkflowId: number;
  WorkflowName: string;
  totalRuns: number;
  lastRunAt: string | null;
  hasSchedule: number; // 0 hoặc 1
}

export default function MyWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning';
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    onConfirm: () => {},
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const res = await fetch('/api/user/workflows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch workflows');
      const data = await res.json();
      setWorkflows(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (workflowId: number) => {
    navigate(`/builder?workflowId=${workflowId}`);
  };

  const handleDelete = async (workflowId: number) => {
    setDeletingId(workflowId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/workflow/${workflowId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      setWorkflows(prev => prev.filter(w => w.WorkflowId !== workflowId));
      toast.success('Workflow đã được xóa thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi xóa workflow: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStopSchedule = async (workflowId: number) => {
    setStoppingId(workflowId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/workflow/stop-schedule/${workflowId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Stop schedule failed');
      await fetchWorkflows(); // Refresh danh sách
      toast.success('Đã tắt lịch chạy tự động thành công!');
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setStoppingId(null);
    }
  };

  // Mở modal xác nhận xóa
  const openDeleteConfirm = (workflow: Workflow) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa workflow',
      message: `Bạn có chắc chắn muốn xóa workflow "${workflow.WorkflowName}"? Hành động này không thể hoàn tác.`,
      type: 'danger',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy bỏ',
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        handleDelete(workflow.WorkflowId);
      }
    });
  };

  // Mở modal xác nhận tắt lịch
  const openStopScheduleConfirm = (workflow: Workflow) => {
    setConfirmModal({
      isOpen: true,
      title: 'Tắt lịch chạy tự động',
      message: `Bạn có chắc muốn tắt lịch chạy tự động cho workflow "${workflow.WorkflowName}"? Workflow sẽ không còn tự động chạy theo lịch đã đặt.`,
      type: 'warning',
      confirmText: 'Tắt lịch',
      cancelText: 'Giữ nguyên',
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        handleStopSchedule(workflow.WorkflowId);
      }
    });
  };

  const filteredWorkflows = workflows.filter(w =>
    w.WorkflowName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[#2b5bee]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-500">Lỗi: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Workflows của tôi
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Quản lý và mở lại các workflow đã tạo.</p>
          
          {/* Search */}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Tìm workflow..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-[#2b5bee] focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-20">
            <Workflow className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Bạn chưa có workflow nào.</p>
            <button
              onClick={() => navigate('/builder')}
              className="mt-4 px-6 py-2 bg-[#2b5bee] text-white rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              Tạo workflow mới
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <motion.div
                key={workflow.WorkflowId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Workflow className="text-blue-500" size={24} />
                    </div>
                    <div className="flex gap-2">
                      {workflow.hasSchedule === 1 && (
                        <button
                          onClick={() => openStopScheduleConfirm(workflow)}
                          disabled={stoppingId === workflow.WorkflowId}
                          className="text-slate-400 hover:text-amber-600 transition-colors"
                          title="Tắt lịch chạy tự động"
                        >
                          {stoppingId === workflow.WorkflowId ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Clock size={18} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(workflow.WorkflowId)}
                        className="text-slate-400 hover:text-[#2b5bee] transition-colors"
                        title="Mở workflow"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(workflow)}
                        disabled={deletingId === workflow.WorkflowId}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Xóa workflow"
                      >
                        {deletingId === workflow.WorkflowId ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-1">
                    {workflow.WorkflowName}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                    <div className="flex items-center gap-1">
                      <Play size={12} />
                      <span>{workflow.totalRuns} lần chạy</span>
                    </div>
                    {workflow.lastRunAt && (
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{new Date(workflow.lastRunAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    )}
                    {workflow.hasSchedule === 1 && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertCircle size={12} />
                        <span>Có lịch</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(workflow.WorkflowId)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-[#2b5bee] hover:text-white py-2.5 rounded-xl text-sm font-medium transition-all"
                  >
                    Mở workflow
                    <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal xác nhận */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    confirmModal.type === 'danger' 
                      ? 'bg-rose-100 text-rose-600' 
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    <AlertTriangle size={24} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{confirmModal.title}</h2>
                </div>
                <button
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="p-1 hover:bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-600">{confirmModal.message}</p>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  {confirmModal.cancelText}
                </button>
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
    </div>
  );
}