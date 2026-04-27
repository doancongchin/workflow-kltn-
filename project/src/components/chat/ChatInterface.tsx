import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, User, Bot, Trash2, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  Id: number;
  Role: 'user' | 'assistant';
  Content: string;
  CreatedAt: string;
}

interface ChatInterfaceProps {
  sessionId: string | null;
  onClearHistory?: () => void;
}

export default function ChatInterface({ sessionId, onClearHistory }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [updatingModel, setUpdatingModel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modelOptions = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Mới nhất, hiệu suất cao' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Nhẹ, tiết kiệm' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', description: 'Thử nghiệm, tiên tiến' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setLimitError(null);
      } else {
        toast.error('Không thể tải tin nhắn');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    }
  };

  const fetchSessionModel = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chat/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const sessions = await res.json();
        const current = sessions.find((s: any) => s.SessionId === sessionId);
        if (current && current.Model) {
          setSelectedModel(current.Model);
        }
      }
    } catch (err) {
      console.error('Error fetching model:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchSessionModel();
  }, [sessionId]);

  const updateSessionModel = async (newModel: string) => {
    if (!sessionId) return;
    setUpdatingModel(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ model: newModel }) 
      });
      if (res.ok) {
        setSelectedModel(newModel);
        toast.success(`Đã chuyển sang model ${modelOptions.find(m => m.value === newModel)?.label}`);
      } else {
        toast.error('Không thể thay đổi model');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    } finally {
      setUpdatingModel(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    setLimitError(null);
    const tempUser: Message = { Id: Date.now(), Role: 'user', Content: input, CreatedAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempUser]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: tempUser.Content })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchMessages();
      } else {
        if (data.message && data.message.includes('giới hạn')) {
          setLimitError(data.message);
        } else {
          toast.error(data.message || 'Gửi tin nhắn thất bại');
        }
        setMessages(prev => prev.filter(m => m.Id !== tempUser.Id));
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
      setMessages(prev => prev.filter(m => m.Id !== tempUser.Id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
          {sessionId ? 'Trò chuyện' : 'Chọn một cuộc trò chuyện'}
        </h2>
        {sessionId && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => updateSessionModel(e.target.value)}
                disabled={updatingModel}
                className="text-sm bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#2b5bee] outline-none"
              >
                {modelOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {limitError && (
              <div className="text-rose-500 text-sm">{limitError}</div>
            )}
            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="text-rose-500 hover:text-rose-700 transition"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Bot size={48} className="mb-2" />
            <p>Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.Id}
              className={`flex ${msg.Role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.Role === 'user' ? 'bg-[#2b5bee] text-white' : 'bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-white'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {msg.Role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  <span className="text-xs opacity-70">{new Date(msg.CreatedAt).toLocaleTimeString()}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.Content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-gray-700 rounded-2xl px-4 py-2 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm text-slate-500 dark:text-gray-400">Đang trả lời...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {sessionId && (
        <div className="p-4 border-t border-slate-200 dark:border-gray-700">
          <div className="flex gap-2">
            <textarea
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2b5bee] focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !!limitError}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !!limitError}
              className="px-4 py-2 bg-[#2b5bee] text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}