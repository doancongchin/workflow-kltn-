import React, { useState, useEffect } from 'react';
import BaseModal from '../nodes/modals/BaseModal';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    systemPrompt: string;
    userFullName: string;
    userBirthYear: number | null;
    userJob: string;
  }) => void;
  initialData?: {
    title: string;
    description: string;
    systemPrompt: string;
    userFullName: string;
    userBirthYear: number | null;
    userJob: string;
  };
}

export default function SessionModal({ isOpen, onClose, onSave, initialData }: SessionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userBirthYear, setUserBirthYear] = useState<number | null>(null);
  const [userJob, setUserJob] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setSystemPrompt(initialData.systemPrompt);
      setUserFullName(initialData.userFullName || '');
      setUserBirthYear(initialData.userBirthYear || null);
      setUserJob(initialData.userJob || '');
    } else {
      setTitle('');
      setDescription('');
      setSystemPrompt('');
      setUserFullName('');
      setUserBirthYear(null);
      setUserJob('');
    }
  }, [initialData, isOpen]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description,
      systemPrompt,
      userFullName,
      userBirthYear,
      userJob,
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Chỉnh sửa cuộc trò chuyện' : 'Cuộc trò chuyện mới'}
      onSave={handleSave}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
            Tên cuộc trò chuyện *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#2b5bee] dark:bg-gray-700 dark:text-white"
            placeholder="Ví dụ: Hỗ trợ khách hàng"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
            Mô tả (tùy chọn)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#2b5bee] dark:bg-gray-700 dark:text-white"
            placeholder="Mô tả ngắn về mục đích của cuộc trò chuyện..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
            Họ và tên
          </label>
          <input
            type="text"
            value={userFullName}
            onChange={(e) => setUserFullName(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#2b5bee] dark:bg-gray-700 dark:text-white"
            placeholder="Tên của bạn"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
            Năm sinh
          </label>
          <input
            type="number"
            value={userBirthYear ?? ''}
            onChange={(e) => setUserBirthYear(e.target.value ? parseInt(e.target.value) : null)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#2b5bee] dark:bg-gray-700 dark:text-white"
            placeholder="Ví dụ: 1990"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
            Nghề nghiệp hiện tại
          </label>
          <input
            type="text"
            value={userJob}
            onChange={(e) => setUserJob(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#2b5bee] dark:bg-gray-700 dark:text-white"
            placeholder="Ví dụ: Kỹ sư phần mềm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
            Chỉ dẫn (system prompt)
          </label>
          <textarea
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#2b5bee] font-mono text-sm dark:bg-gray-700 dark:text-white"
            placeholder="Nhập hướng dẫn cho AI, ví dụ: Bạn là chuyên gia tư vấn bán hàng, hãy trả lời lịch sự..."
          />
        </div>
      </div>
    </BaseModal>
  );
}