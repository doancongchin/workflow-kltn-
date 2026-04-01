import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash2, LucideIcon, Bot, Brain, FileText, Clock } from 'lucide-react';

// Mapping từ tên icon (string) sang component
const iconMap: Record<string, LucideIcon> = {
  'AI Agent': Bot,
  'LLM': Brain,
  'File Parser': FileText,
  // Thêm các node khác nếu có
  'Bot': Bot,
  'Brain': Brain,
  'FileText': FileText,
  'Scheduler': Clock,
};

interface ActionNodeData {
  label: string;
  description: string;
  icon?: string | LucideIcon; // Có thể là string hoặc component (dự phòng)
  iconColor?: string;
  tags?: string[];
  onNodeClick?: (id: string, type: string, data: any) => void;
  onDelete?: (id: string) => void;
}

export default function ActionNode({ data, id }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData;
  
  // Xác định icon: ưu tiên string -> map, nếu không thì dùng label fallback
  let IconComponent: LucideIcon | undefined;
  if (typeof nodeData.icon === 'string') {
    IconComponent = iconMap[nodeData.icon] || iconMap[nodeData.label];
  } else if (nodeData.icon && typeof nodeData.icon === 'function') {
    IconComponent = nodeData.icon; // fallback cho dữ liệu cũ (component)
  } else {
    IconComponent = iconMap[nodeData.label];
  }
  
  const iconColor = nodeData.iconColor;

  return (
    <div className="group relative">
      <div 
        className="w-60 bg-white rounded-xl border border-slate-200 shadow-xl p-4 relative hover:border-[#2b5bee] hover:ring-2 hover:ring-blue-500/10 transition-all cursor-pointer"
        onClick={() => nodeData.onNodeClick?.(id, 'action', nodeData)}
      >
        <div className="flex items-center gap-2 mb-3">
          {IconComponent && <IconComponent className={iconColor} size={18} />}
          <span className="text-xs font-bold uppercase tracking-wide">{nodeData.label}</span>
        </div>
        <p className="text-sm font-medium text-slate-600 mb-2">{nodeData.description}</p>
        {nodeData.tags && (
          <div className="flex flex-wrap gap-1">
            {nodeData.tags.map((tag: string, i: number) => (
              <span key={i} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        )}
        
        <Handle 
          type="target" 
          position={Position.Left} 
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white !-left-1.5" 
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          className="!w-4 !h-4 !bg-[#2b5bee] !border-4 !border-white !-right-2" 
        />
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          nodeData.onDelete?.(id);
        }}
        className="absolute -top-3 -right-3 size-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 shadow-lg opacity-0 group-hover:opacity-100 transition-all z-20"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}