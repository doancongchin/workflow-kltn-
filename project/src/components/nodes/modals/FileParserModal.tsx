import React, { useState, useRef, useEffect } from 'react';
import BaseModal from './BaseModal';
import { Upload, Loader2, FileText, Copy, X } from 'lucide-react';

interface FileParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  nodeId?: string;
  onSave?: (newData: any) => void;
}

interface TestResultItem {
  fileName: string;
  text: string; 
}

interface UploadResult {
  filePaths: string[];
}

export default function FileParserModal({ isOpen, onClose, data, nodeId, onSave }: FileParserModalProps) {
  const [systemPrompt, setSystemPrompt] = useState(
    data.systemPrompt ||
    'Bạn là chuyên gia trích xuất thông tin từ file. Hãy phân tích nội dung và trả về MỘT ĐỐI TƯỢNG JSON hợp lệ với các trường phù hợp. KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC NGOÀI JSON.'
  );
  const [model, setModel] = useState(data.model || 'gemini-2.5-flash');
  const [fileNames, setFileNames] = useState<string[]>(data.fileNames || []);
  const [storedFilePaths, setStoredFilePaths] = useState<string[]>(data.storedFilePaths || []);
  const [files, setFiles] = useState<File[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultItem[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSystemPrompt(data.systemPrompt || 'Bạn là chuyên gia trích xuất thông tin từ file. Hãy phân tích nội dung và trả về MỘT ĐỐI TƯỢNG JSON hợp lệ với các trường phù hợp. KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC NGOÀI JSON.');
      setModel(data.model || 'gemini-2.5-flash');
      setFileNames(data.fileNames || []);
      setStoredFilePaths(data.storedFilePaths || []);
      setFiles([]);
      setTestResult(null);
      setTestError(null);
    }
  }, [isOpen, data]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      const newFiles = Array.from(selected) as File[];
      setFiles(prev => [...prev, ...newFiles]);
      setFileNames(prev => [...prev, ...newFiles.map((f: File) => f.name)]);
      setTestResult(null);
      setTestError(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileNames(prev => prev.filter((_, i) => i !== index));
  };

  const handleTest = async () => {
    if (files.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setTestError('Bạn chưa đăng nhập');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    const formData = new FormData();
    files.forEach((file: File) => formData.append('files', file));
    formData.append('prompt', systemPrompt);
    formData.append('model', model);

    try {
      const res = await fetch('/api/parser', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        setTestResult(result.files as TestResultItem[]);
      } else {
        setTestError(result.error || `Lỗi ${res.status}: ${res.statusText}`);
        if (result.raw) console.log('Raw response:', result.raw);
      }
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyId = () => {
    if (nodeId) {
      navigator.clipboard.writeText(nodeId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSave = async () => {
    if (files.length > 0) {
      setIsUploading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setTestError('Bạn chưa đăng nhập');
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      files.forEach((file: File) => formData.append('files', file));

      try {
        const res = await fetch('/api/upload-node-files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const result = await res.json();
        if (res.ok && result.filePaths) {
          const uploadResult = result as UploadResult;
          setStoredFilePaths(uploadResult.filePaths);
          setFileNames(files.map((f: File) => f.name));
          if (onSave) {
            onSave({
              systemPrompt,
              model,
              fileNames: files.map((f: File) => f.name),
              storedFilePaths: uploadResult.filePaths
            });
          }
        } else {
          setTestError(result.error || 'Lỗi upload file');
          setIsUploading(false);
          return;
        }
      } catch (err: any) {
        setTestError(err.message);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    } else {
      if (onSave) {
        onSave({
          systemPrompt,
          model,
          fileNames,
          storedFilePaths
        });
      }
    }
    onClose();
  };

  const modelOptions = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Mới nhất, hiệu suất cao' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Nhẹ, tiết kiệm' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', description: 'Thử nghiệm, tiên tiến' },
  ];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="File Parser Configuration" onSave={handleSave} saveLabel={isUploading ? 'Đang upload...' : 'Save Changes'}>
      <div className="space-y-4">
        {nodeId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">
                Node ID: <code className="bg-blue-100 px-1 py-0.5 rounded">{nodeId}</code>
              </span>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
              >
                <Copy size={12} />
                {copySuccess ? 'Đã copy!' : 'Copy ID'}
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Sử dụng <code className="bg-blue-100 px-1 rounded">{`{{${nodeId}.file}}`}</code> để lấy dữ liệu đã trích xuất,<br />
              hoặc <code className="bg-blue-100 px-1 rounded">{`{{${nodeId}.fileName}}`}</code> để lấy tên file.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-[#2b5bee] focus:border-[#2b5bee] outline-none"
          >
            {modelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">{modelOptions.find(m => m.value === model)?.description}</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            System Prompt (hướng dẫn trích xuất)
          </label>
          <textarea
            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-[#2b5bee] focus:border-[#2b5bee] outline-none resize-none"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Nhập hướng dẫn cho AI..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Chọn file (PDF, DOCX, CSV, Excel, TXT) - Tối đa 10 file
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.csv,.xlsx,.xls,.txt"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 transition flex items-center gap-2"
            >
              <Upload size={16} />
              {fileNames.length > 0 ? 'Thêm file' : 'Chọn file'}
            </button>
            {fileNames.length > 0 && (
              <span className="text-sm text-slate-600">{fileNames.length} file đã chọn</span>
            )}
          </div>

          {fileNames.length > 0 && (
            <div className="mt-2 space-y-1">
              {fileNames.map((name, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-xs truncate max-w-[200px]">{name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {storedFilePaths.length > 0 && files.length === 0 && (
            <p className="text-xs text-emerald-600 mt-1">✓ Đã lưu {storedFilePaths.length} file</p>
          )}
        </div>

        <div>
          <button
            onClick={handleTest}
            disabled={files.length === 0 || isTesting}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isTesting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {isTesting ? 'Đang xử lý...' : 'Test Parse'}
          </button>
        </div>

        {testResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Kết quả</h4>
              <div className="text-xs text-slate-700 overflow-auto max-h-40 whitespace-pre-wrap">
                {testResult.map((item, idx) => (
                  <div key={idx} className="mb-2">
                    <p className="font-semibold">{item.fileName}</p>
                    <p>{item.text}</p>  {/* ✅ Đã sửa từ item.data thành item.text */}
                  </div>
                ))}
              </div>
            </div>
          )}

        {testError && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-600 text-sm">
            {testError}
          </div>
        )}
      </div>
    </BaseModal>
  );
}