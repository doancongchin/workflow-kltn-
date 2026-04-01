import React, { useState } from 'react';
import BaseModal from './BaseModal';
import { Bot, User, Loader2, Copy, Send } from 'lucide-react';

interface LlmModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  nodeId?: string;
  onSave?: (newData: any) => void;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export default function LlmModal({ isOpen, onClose, data, nodeId, onSave }: LlmModalProps) {
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt || 'You are a helpful assistant.');
  const [userPrompt, setUserPrompt] = useState(data.userPrompt || '');
  const [model, setModel] = useState(data.model || 'gemini-2.5-flash');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyId = () => {
    if (nodeId) {
      navigator.clipboard.writeText(nodeId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSend = async () => {
    if (!userPrompt.trim()) return;

    const newUserMessage: Message = { role: 'user', content: userPrompt };
    setMessages(prev => [...prev, newUserMessage]);
    setUserPrompt('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const fullPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${userPrompt}` : userPrompt;

      const response = await fetch('http://localhost:3001/api/workflow/execute-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: fullPrompt, model })
      });

      if (!response.ok) throw new Error('Failed to get response');
      const result = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: result.output };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = { role: 'assistant', content: 'Error: ' + (error as Error).message };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ systemPrompt, userPrompt, model });
    }
    onClose();
  };

  const modelOptions = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Mới nhất, hiệu suất cao' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Nhẹ, tiết kiệm' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', description: 'Thử nghiệm, tiên tiến' },
  ];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="LLM Configuration" onSave={handleSave}>
      <div className="space-y-5">
        {nodeId && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-800">
                Node ID: <code className="bg-emerald-100 px-2 py-1 rounded-md text-xs font-mono">{nodeId}</code>
              </span>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition shadow-sm"
              >
                <Copy size={12} />
                {copySuccess ? 'Đã copy!' : 'Copy ID'}
              </button>
            </div>
            <p className="text-xs text-emerald-700 mt-2">
              Sử dụng <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs font-mono">{`{{${nodeId}.response}}`}</code> trong các node khác để lấy kết quả từ LLM.
            </p>
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all shadow-sm"
          >
            {modelOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            {modelOptions.find(m => m.value === model)?.description}
          </p>
        </div>

        {/* System Prompt Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            System Prompt
          </label>
          <textarea
            className="w-full h-36 bg-white border border-slate-200 rounded-xl text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all resize-none shadow-sm"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Nhập hướng dẫn cho AI..."
          />
        </div>

        {/* Test Chat Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Test Chat
          </label>
          <div className="h-48 bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-y-auto shadow-inner">
            {messages.length === 0 ? (
              <p className="text-center text-slate-400 text-sm mt-12">Không có tin nhắn nào.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        msg.role === 'assistant' ? 'bg-emerald-600' : 'bg-slate-400'
                      } shadow-sm`}
                    >
                      {msg.role === 'assistant' ? (
                        <Bot size={14} className="text-white" />
                      ) : (
                        <User size={14} className="text-white" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        msg.role === 'assistant'
                          ? 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                          : 'bg-emerald-600 text-white shadow-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Bot size={14} className="text-white animate-pulse" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-sm text-slate-500 flex items-center gap-2 shadow-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Đang suy nghĩ...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <textarea
            className="flex-1 h-16 bg-slate-50 border border-slate-200 rounded-xl text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all resize-none"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Nhập tin nhắn để test..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !userPrompt.trim()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={18} />
            Gửi
          </button>
        </div>
      </div>
    </BaseModal>
  );
}