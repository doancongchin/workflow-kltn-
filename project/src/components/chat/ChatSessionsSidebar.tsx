import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import SessionModal from './SessionModal';
import BaseModal from '../nodes/modals/BaseModal';

interface Session {
  SessionId: string;
  Title: string;
  Description: string;
  SystemPrompt: string;
  Model: string;
  UserFullName: string;
  UserBirthYear: number | null;
  UserJob: string;
  CreatedAt: string;
  UpdatedAt: string;
}

interface ChatSessionsSidebarProps {
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onSessionCreated?: () => void;
}

export default function ChatSessionsSidebar({ selectedSessionId, onSelectSession, onSessionCreated }: ChatSessionsSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionTitle: string;
  }>({
    isOpen: false,
    sessionId: null,
    sessionTitle: '',
  });

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chat/sessions', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      } else {
        toast.error('Không thể tải danh sách cuộc trò chuyện');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreate = () => {
    setEditingSession(null);
    setModalOpen(true);
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setModalOpen(true);
  };

  const openDeleteConfirm = (sessionId: string, sessionTitle: string) => {
    setConfirmModal({ isOpen: true, sessionId, sessionTitle });
  };

  const handleDelete = async () => {
    const { sessionId } = confirmModal;
    if (!sessionId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        toast.success('Đã xóa');
        fetchSessions();
        if (selectedSessionId === sessionId) {
          onSelectSession('');
        }
      } else {
        toast.error('Xóa thất bại');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    } finally {
      setConfirmModal({ isOpen: false, sessionId: null, sessionTitle: '' });
    }
  };

  const handleSaveSession = async (data: {
    title: string;
    description: string;
    systemPrompt: string;
    userFullName: string;
    userBirthYear: number | null;
    userJob: string;
  }) => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/chat/sessions';
      let method = 'POST';
      if (editingSession) {
        url = `/api/chat/sessions/${editingSession.SessionId}`;
        method = 'PUT';
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success(editingSession ? 'Cập nhật thành công' : 'Tạo cuộc trò chuyện mới thành công');
        fetchSessions();
        if (!editingSession) {
          const newSession = await res.json();
          if (newSession.sessionId) onSelectSession(newSession.sessionId);
        }
        setModalOpen(false);
        if (onSessionCreated) onSessionCreated();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Lưu thất bại');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 dark:text-white">Cuộc trò chuyện</h2>
        <button
          onClick={handleCreate}
          className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition"
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-center py-4 text-slate-400 dark:text-gray-500">Đang tải...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-gray-500">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p>Chưa có cuộc trò chuyện nào</p>
            <button onClick={handleCreate} className="mt-2 text-[#2b5bee] text-sm">Tạo mới</button>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.SessionId}
              className={`group relative rounded-lg p-3 cursor-pointer transition-colors ${
                selectedSessionId === session.SessionId
                  ? 'bg-[#2b5bee] text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => onSelectSession(session.SessionId)}
            >
              <div className="pr-12">
                <h3 className="font-medium text-sm truncate">{session.Title}</h3>
                <p className="text-xs opacity-70 truncate">{session.Description || 'Không có mô tả'}</p>
                <p className="text-[10px] opacity-50 mt-1">
                  {new Date(session.UpdatedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(session); }}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openDeleteConfirm(session.SessionId, session.Title); }}
                  className="p-1 hover:bg-white/20 rounded text-rose-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <SessionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSession}
        initialData={editingSession ? {
          title: editingSession.Title,
          description: editingSession.Description,
          systemPrompt: editingSession.SystemPrompt,
          userFullName: editingSession.UserFullName,
          userBirthYear: editingSession.UserBirthYear,
          userJob: editingSession.UserJob,
        } : undefined}
      />

      {/* Custom confirmation modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
                    <Trash2 size={24} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Xóa cuộc trò chuyện</h2>
                </div>
                <button
                  onClick={() => setConfirmModal({ isOpen: false, sessionId: null, sessionTitle: '' })}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-600 dark:text-gray-300">
                  Bạn có chắc chắn muốn xóa cuộc trò chuyện "<strong>{confirmModal.sessionTitle}</strong>"?
                  Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, sessionId: null, sessionTitle: '' })}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-md shadow-rose-500/20"
                >
                  Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}