import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import { Bot, Plus, X, Mail, Cpu, ChevronDown, Copy } from 'lucide-react';

interface AiAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  nodeId?: string;
  onSave?: (newData: any) => void;
}

interface Tool {
  ToolId: number;
  ToolName: string;
  DisplayName: string;
  Description: string;
  IsConnected: boolean;
}

export default function AiAgentModal({ isOpen, onClose, data, nodeId, onSave }: AiAgentModalProps) {
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt || 'You are a helpful AI agent.');
  const [selectedTools, setSelectedTools] = useState<number[]>(data.selectedTools || []);
  const [model, setModel] = useState(data.model || 'gemini-2.5-flash');
  const [tools, setTools] = useState<Tool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTools();
    }
  }, [isOpen]);

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
    } catch (error) {
      console.error('Lỗi lấy tools:', error);
    } finally {
      setLoadingTools(false);
    }
  };

  const toggleTool = (toolId: number) => {
    setSelectedTools(prev =>
      prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
    );
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ systemPrompt, selectedTools, model });
    }
    onClose();
  };

  const handleCopyId = () => {
    if (nodeId) {
      navigator.clipboard.writeText(nodeId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const modelOptions = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Mới nhất, hiệu suất cao' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Nhẹ, tiết kiệm' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', description: 'Thử nghiệm, tiên tiến' },
  ];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="AI Agent Configuration" onSave={handleSave}>
      <div className="space-y-5">
        {/* Node ID */}
        {nodeId && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-800">
                Node ID: <code className="bg-purple-100 px-2 py-1 rounded-md text-xs font-mono">{nodeId}</code>
              </span>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition shadow-sm"
              >
                <Copy size={12} />
                {copySuccess ? 'Đã copy!' : 'Copy ID'}
              </button>
            </div>
            <p className="text-xs text-purple-700 mt-2">
              Sử dụng <code className="bg-purple-100 px-1.5 py-0.5 rounded text-xs font-mono">{`{{${nodeId}.response}}`}</code> để lấy kết quả từ AI Agent.
            </p>
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Cpu size={18} className="text-[#2b5bee]" />
            Model
          </label>
          <div className="relative">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b5bee]/20 focus:border-[#2b5bee] transition-shadow"
            >
              {modelOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          </div>
          <p className="text-xs text-slate-500 italic">
            {modelOptions.find(m => m.value === model)?.description}
          </p>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Bot size={18} className="text-[#2b5bee]" />
            System Prompt
          </label>
          <textarea
            className="w-full h-36 bg-white border border-slate-200 rounded-xl text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2b5bee]/20 focus:border-[#2b5bee] transition-shadow resize-none"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Nhập hướng dẫn cho AI agent..."
          />
        </div>

        {/* Tools */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Bot size={18} className="text-[#2b5bee]" />
            Công cụ tích hợp
          </label>
          <div className="max-h-56 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {loadingTools ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2b5bee]"></div>
              </div>
            ) : (
              tools.map(tool => (
                <div
                  key={tool.ToolId}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selectedTools.includes(tool.ToolId)
                      ? 'border-[#2b5bee] bg-blue-50/70'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`shrink-0 w-9 h-9 rounded-lg ${tool.IsConnected ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center`}>
                      {tool.ToolName === 'gmail' ? 
                        <Mail size={18} className={tool.IsConnected ? 'text-emerald-600' : 'text-slate-400'} /> : 
                        <Bot size={18} className={tool.IsConnected ? 'text-[#2b5bee]' : 'text-slate-400'} />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{tool.DisplayName}</p>
                      <p className="text-xs text-slate-500 truncate">{tool.Description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleTool(tool.ToolId)}
                    disabled={!tool.IsConnected}
                    className={`shrink-0 ml-2 p-1.5 rounded-lg transition-all ${
                      !tool.IsConnected
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        : selectedTools.includes(tool.ToolId)
                        ? 'bg-[#2b5bee] text-white hover:bg-blue-700'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                    title={!tool.IsConnected ? 'Cần kết nối trước khi sử dụng' : ''}
                  >
                    {selectedTools.includes(tool.ToolId) ? <X size={16} /> : <Plus size={16} />}
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-slate-500 italic">
            Chọn công cụ AI agent có thể sử dụng.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}