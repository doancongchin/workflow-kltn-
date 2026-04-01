import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Square } from 'lucide-react';

interface EndNodeData {
  label: string;
  onNodeClick?: (id: string, type: string, data: any) => void;
}

export default function EndNode({ data, id }: NodeProps) {
  const nodeData = data as unknown as EndNodeData;
  return (
    <div className="group relative">
      <div 
        className="w-60 bg-white rounded-xl border-2 border-slate-900 shadow-xl p-4 relative hover:ring-2 hover:ring-slate-900/20 transition-all cursor-pointer"
        onClick={() => nodeData.onNodeClick?.(id, 'end', nodeData)}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="size-6 bg-slate-900 rounded flex items-center justify-center text-white shadow-sm">
            <Square size={14} fill="currentColor" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wide">End</span>
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">Workflow Termination</p>
        <p className="text-[10px] text-slate-400">Success Completion</p>
        
        <Handle 
          type="target" 
          position={Position.Left} 
          className="!w-4 !h-4 !bg-slate-900 !border-4 !border-white !-left-2" 
        />
      </div>
    </div>
  );
}
