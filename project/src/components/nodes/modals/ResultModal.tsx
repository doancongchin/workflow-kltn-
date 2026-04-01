import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  message: string;
  output?: any;
}

export default function ResultModal({ isOpen, onClose, success, message, output }: ResultModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = output ? JSON.stringify(output, null, 2) : message;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatOutput = (data: any): string => {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header với gradient và icon động */}
            <div
              className={`relative px-6 py-5 border-b ${
                success
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100'
                  : 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      success ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}
                  >
                    {success ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      {success ? 'Workflow hoàn tất' : 'Workflow thất bại'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {success ? 'Quá trình xử lý đã kết thúc thành công' : 'Có lỗi xảy ra trong quá trình xử lý'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Nội dung chính */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Thông báo chính */}
              <div
                className={`p-4 rounded-xl border ${
                  success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
              </div>

              {/* Kết quả chi tiết (nếu có) */}
              {output && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Kết quả chi tiết
                    </label>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 transition-colors shadow-sm"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span>Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-900 rounded-xl overflow-hidden">
                    <pre className="text-sm text-slate-100 p-4 overflow-auto max-h-[60vh] font-mono leading-relaxed whitespace-pre-wrap break-words">
                      {formatOutput(output)}
                    </pre>
                  </div>
                  {output.spreadsheetUrl && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700">
                        🔗 Link Google Sheet:{' '}
                        <a
                          href={output.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium hover:text-blue-800"
                        >
                          {output.spreadsheetUrl}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-[#2b5bee] hover:bg-blue-600 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}