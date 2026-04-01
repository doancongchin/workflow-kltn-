import React, { useState } from 'react';
import BaseModal from './BaseModal';
import { Clock } from 'lucide-react';

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  nodeId?: string;
  onSave?: (newData: any) => void;
}

export default function SchedulerModal({ isOpen, onClose, data, nodeId, onSave }: SchedulerModalProps) {
  const [cronExpression, setCronExpression] = useState(data.cronExpression || '0 9 * * *');
  const [description, setDescription] = useState(data.description || 'Every day at 9:00 AM');

  const cronExamples = [
    { value: '0 9 * * *', label: 'Mỗi ngày lúc 9:00 sáng' },
    { value: '0 0 * * 0', label: 'Mỗi Chủ Nhật lúc 0:00' },
    { value: '0 */6 * * *', label: 'Mỗi 6 giờ' },
    { value: '0 0 1 * *', label: 'Mùng 1 hàng tháng' }
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({ cronExpression, description });
    }
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Scheduler Configuration" onSave={handleSave}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <Clock size={20} />
            <h3 className="font-bold">Lịch chạy tự động</h3>
          </div>
          <p className="text-sm text-amber-700 mt-1">Workflow sẽ tự động chạy theo thời gian bạn thiết lập.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Cron Expression
          </label>
          <input
            type="text"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 outline-none"
            placeholder="0 9 * * *"
          />
          <p className="text-xs text-slate-400 mt-1">Định dạng: phút giờ ngày tháng thứ (cron)</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Mô tả
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 outline-none"
            placeholder="Mỗi ngày lúc 9:00 sáng"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Ví dụ nhanh
          </label>
          <div className="space-y-1">
            {cronExamples.map((ex, i) => (
              <button
                key={i}
                onClick={() => { setCronExpression(ex.value); setDescription(ex.label); }}
                className="text-left w-full text-sm text-slate-600 hover:text-amber-600 px-2 py-1 rounded hover:bg-amber-50"
              >
                {ex.label} ({ex.value})
              </button>
            ))}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}