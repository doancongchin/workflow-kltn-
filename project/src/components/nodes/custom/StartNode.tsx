import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';

interface StartNodeData {
  label: string;
  onNodeClick?: (id: string, type: string, data: any) => void;
}

export default function StartNode({ data, id }: NodeProps) {
  const nodeData = data as unknown as StartNodeData;
  return (
    <div className="group relative">
      <div 
        className="w-60 bg-white rounded-xl border-2 border-blue-500 shadow-xl p-4 relative hover:ring-2 hover:ring-blue-500/20 transition-all cursor-pointer"
        onClick={() => nodeData.onNodeClick?.(id, 'start', nodeData)}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="size-6 bg-blue-500 rounded flex items-center justify-center text-white shadow-sm">
            <Play size={14} fill="currentColor" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wide">Start</span>
          <span className="ml-auto flex size-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">Workflow Entry</p>
        <p className="text-[10px] text-slate-400">Manual or Scheduled Trigger</p>
        
        <Handle 
          type="source" 
          position={Position.Right} 
          className="!w-4 !h-4 !bg-blue-500 !border-4 !border-white !-right-2" 
        />
      </div>
    </div>
  );
}
