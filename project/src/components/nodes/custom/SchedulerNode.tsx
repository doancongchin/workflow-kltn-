import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, Trash2 } from 'lucide-react';

interface SchedulerNodeData {
  label: string;
  description?: string;
  cronExpression?: string;
  onNodeClick?: (id: string, type: string, data: any) => void;
  onDelete?: (id: string) => void;
}

export default function SchedulerNode({ data, id }: NodeProps) {
  const nodeData = data as unknown as SchedulerNodeData;
  return (
    <div className="group relative">
      <div 
        className="w-60 bg-white rounded-xl border-2 border-amber-500 shadow-xl p-4 relative hover:ring-2 hover:ring-amber-500/20 transition-all cursor-pointer"
        onClick={() => nodeData.onNodeClick?.(id, 'trigger', nodeData)}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock className="text-amber-500" size={16} />
          <span className="text-xs font-bold uppercase tracking-wide">Scheduler</span>
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">
          {nodeData.description || 'Run workflow on schedule'}
        </p>
        <code className="text-[10px] bg-slate-50 px-2 py-1 rounded block truncate text-slate-400">
          {nodeData.cronExpression || '0 9 * * * (Every day at 9:00 AM)'}
        </code>
        <Handle type="source" position={Position.Right} className="!w-4 !h-4 !bg-amber-500 !border-4 !border-white !-right-2" />
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); nodeData.onDelete?.(id); }}
        className="absolute -top-3 -right-3 size-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 shadow-lg opacity-0 group-hover:opacity-100 transition-all z-20"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}