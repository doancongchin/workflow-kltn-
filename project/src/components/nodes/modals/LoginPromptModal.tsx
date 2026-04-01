import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginPromptModal({ isOpen, onClose }: LoginPromptModalProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Yêu cầu đăng nhập</h2>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-center">
              <LogIn size={48} className="mx-auto text-[#2b5bee] mb-4" />
              <p className="text-slate-600 mb-6">
                Bạn cần đăng nhập để sử dụng tính năng này. Vui lòng đăng nhập hoặc đăng ký tài khoản mới.
              </p>
              <button
                onClick={handleLogin}
                className="px-6 py-2 bg-[#2b5bee] text-white rounded-lg font-semibold hover:bg-blue-600 transition"
              >
                Đăng nhập / Đăng ký
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}