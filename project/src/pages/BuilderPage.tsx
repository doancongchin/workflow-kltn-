import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Clock, Zap, Bot, Brain, Play, Edit3, MoreHorizontal, Plus, Loader2
} from 'lucide-react';
import { FileText } from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import toast from 'react-hot-toast';

import StartNode from '../components/nodes/custom/StartNode';
import EndNode from '../components/nodes/custom/EndNode';
import ActionNode from '../components/nodes/custom/ActionNode';
import SchedulerNode from '../components/nodes/custom/SchedulerNode';
import LlmModal from '../components/nodes/modals/LlmModal';
import AiAgentModal from '../components/nodes/modals/AiAgentModal';
import FileParserModal from '../components/nodes/modals/FileParserModal';
import ResultModal from '../components/nodes/modals/ResultModal';
import LoginPromptModal from '../components/nodes/modals/LoginPromptModal';
import SchedulerModal from '../components/nodes/modals/SchedulerModal';

let idCounter = 10;
const getId = () => `${idCounter++}`;

export default function BuilderPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [workflowId, setWorkflowId] = useState<number | null>(null);
  const [workflowName, setWorkflowName] = useState('Inbound Lead Processor');
  const [isRunning, setIsRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialNodes, setInitialNodes] = useState<Node[]>([]);
  const [initialEdges, setInitialEdges] = useState<Edge[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; success: boolean; message: string; output?: any }>({
    isOpen: false,
    success: false,
    message: '',
    output: null,
  });

  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeModal, setActiveModal] = useState<{ type: string; data: any; nodeId: string } | null>(null);

  // Template editing for admin
  const [searchParams] = useSearchParams();
  const editTemplateId = searchParams.get('editTemplateId');
  const newTemplate = searchParams.get('newTemplate');
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  // Template form state (only for admin)
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateImageUrl, setTemplateImageUrl] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateStatus, setTemplateStatus] = useState('Active');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Authentication check
  useEffect(() => {
    if (isAuthenticated) setShowLoginModal(false);
  }, [isAuthenticated]);

  const requireAuth = (callback: () => void) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    callback();
  };

  const onNodeClick = useCallback((id: string, type: string, data: any) => {
    setActiveModal({ type, data, nodeId: id });
  }, []);

  // ✅ Sửa: Thêm kiểu cho tham số
  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds: Node[]) => nds.filter((node) => node.id !== id));
    setEdges((eds: Edge[]) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  }, []);

  // ✅ Sửa: Thêm kiểu cho tham số
  const onSaveNodeConfig = useCallback((nodeId: string, newData: any) => {
    setNodes((nds: Node[]) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  }, []);

  const nodeTypes = useMemo(() => ({
    start: StartNode,
    end: EndNode,
    action: ActionNode,
    trigger: SchedulerNode,
  }), []);

const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(initialNodes);
    const edgesChanged = JSON.stringify(edges) !== JSON.stringify(initialEdges);
    setIsDirty(nodesChanged || edgesChanged);
  }, [nodes, edges, initialNodes, initialEdges]);

  // Load data based on URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get('templateId');
    const workflowIdParam = params.get('workflowId');

    if (editTemplateId) {
      loadTemplateForEdit(parseInt(editTemplateId));
    } else if (templateId) {
      loadTemplate(parseInt(templateId));
    } else if (workflowIdParam) {
      loadWorkflow(parseInt(workflowIdParam));
    } else if (newTemplate) {
      const defaultNodes: Node[] = [
        { id: 'start-node', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Start', onNodeClick, onDelete: onDeleteNode } },
        { id: 'end-node', type: 'end', position: { x: 900, y: 200 }, data: { label: 'End', onNodeClick, onDelete: onDeleteNode } },
      ];
      setNodes(defaultNodes);
      setInitialNodes(defaultNodes);
      setEdges([]);
      setInitialEdges([]);
      setWorkflowName('New Template Workflow');
      setTemplateTitle('');
      setTemplateDescription('');
      setTemplateImageUrl('');
      setTemplateCategory('');
      setTemplateStatus('Active');
      setIsEditingTemplate(false);
    } else {
      const defaultNodes: Node[] = [
        { id: 'start-node', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Start', onNodeClick, onDelete: onDeleteNode } },
        { id: 'end-node', type: 'end', position: { x: 900, y: 200 }, data: { label: 'End', onNodeClick, onDelete: onDeleteNode } },
      ];
      setNodes(defaultNodes);
      setInitialNodes(defaultNodes);
      setEdges([]);
      setInitialEdges([]);
    }
  }, []);

  const loadTemplateForEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (res.ok) {
        const data = await res.json();
        const workflowData = JSON.parse(data.WorkflowData);
        const nodesWithHandlers = workflowData.nodes.map((node: any) => ({
          ...node,
          data: { ...node.data, onNodeClick, onDelete: onDeleteNode },
        }));
        setNodes(nodesWithHandlers);
        setInitialNodes(nodesWithHandlers);
        setEdges(workflowData.edges || []);
        setInitialEdges(workflowData.edges || []);
        setWorkflowName(data.Title);
        setTemplateTitle(data.Title);
        setTemplateDescription(data.Description || '');
        setTemplateImageUrl(data.ImageUrl || '');
        setTemplateCategory(data.Category || '');
        setTemplateStatus(data.Status || 'Active');
        setIsEditingTemplate(true);
      } else {
        console.error('Template not found');
        toast.error('Không tìm thấy template');
      }
    } catch (error) {
      console.error('Load template for edit error:', error);
      toast.error('Lỗi tải template');
    }
  };

  const loadTemplate = async (id: number) => {
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (res.ok) {
        const data = await res.json();
        const workflowData = JSON.parse(data.WorkflowData);
        const nodesWithHandlers = workflowData.nodes.map((node: any) => ({
          ...node,
          data: { ...node.data, onNodeClick, onDelete: onDeleteNode },
        }));
        setNodes(nodesWithHandlers);
        setInitialNodes(nodesWithHandlers);
        setEdges(workflowData.edges || []);
        setInitialEdges(workflowData.edges || []);
        setWorkflowName(data.Title);
      } else {
        console.error('Template not found');
        toast.error('Không tìm thấy template');
      }
    } catch (error) {
      console.error('Load template error:', error);
      toast.error('Lỗi tải template');
    }
  };

  const loadWorkflow = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/workflow/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflowId(data.workflowId);
        setWorkflowName(data.name);
        const loadedNodes = data.nodes.map((n: any) => ({
          id: n.NodeId,
          type: n.NodeType,
          position: { x: n.PosX, y: n.PosY },
          data: { 
            ...JSON.parse(n.DataConfig || '{}'),
            onNodeClick,
            onDelete: onDeleteNode,
            label: n.Label
          }
        }));
        const loadedEdges = data.edges.map((e: any) => ({
          id: e.EdgeId,
          source: e.SourceNodeId,
          target: e.TargetNodeId,
          sourceHandle: e.SourceHandle,
          targetHandle: e.TargetHandle,
          type: e.EdgeType,
        }));
        setNodes(loadedNodes);
        setInitialNodes(loadedNodes);
        setEdges(loadedEdges);
        setInitialEdges(loadedEdges);
      } else {
        console.error('Load workflow failed');
        toast.error('Không thể tải workflow');
      }
    } catch (error) {
      console.error('Load workflow error:', error);
      toast.error('Lỗi kết nối khi tải workflow');
    }
  };

  const handleSaveWorkflow = () => {
    requireAuth(async () => {
      if (!isDirty) return;
      setSaving(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/workflow/save', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: workflowName,
            nodes: nodes.map(n => ({
              id: n.id,
              type: n.type,
              position: n.position,
              data: n.data
            })),
            edges: edges,
            workflowId: workflowId
          })
        });

        if (response.ok) {
          const result = await response.json();
          setWorkflowId(result.workflowId);
          setInitialNodes(nodes);
          setInitialEdges(edges);
          setIsDirty(false);
          toast.success('Đã lưu Workflow thành công!', { duration: 2000 });
        } else {
          const errorData = await response.json();
          toast.error('Lỗi từ Server: ' + errorData.message);
        }
      } catch (error) {
        toast.error('Không thể kết nối tới Backend (Port 3001)');
      } finally {
        setSaving(false);
      }
    });
  };

  const handleRunWorkflow = () => {
    requireAuth(async () => {
      if (!workflowId) {
        setResultModal({
          isOpen: true,
          success: false,
          message: 'Vui lòng lưu workflow trước khi chạy!',
          output: null,
        });
        return;
      }
      setIsRunning(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/workflow/run/${workflowId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (response.ok) {
          setResultModal({
            isOpen: true,
            success: true,
            message: 'Workflow đã được thực thi thành công.',
            output: result.output,
          });
        } else {
          setResultModal({
            isOpen: true,
            success: false,
            message: `Lỗi: ${result.error || result.message}`,
            output: result,
          });
        }
      } catch (error: any) {
        setResultModal({
          isOpen: true,
          success: false,
          message: 'Không thể kết nối server',
          output: { error: error.message },
        });
      } finally {
        setIsRunning(false);
      }
    });
  };

  const handleSaveTemplate = async () => {
    if (!isAdmin) {
      toast.error('Chỉ admin mới có quyền lưu template');
      return;
    }
    if (!templateTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề template');
      return;
    }

    setSavingTemplate(true);
    const workflowData = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges,
    };

    const payload = {
      title: templateTitle,
      description: templateDescription,
      status: templateStatus,
      steps: nodes.length,
      imageUrl: templateImageUrl,
      category: templateCategory,
      workflowData,
    };

    const token = localStorage.getItem('token');
    const method = isEditingTemplate ? 'PUT' : 'POST';
    const url = isEditingTemplate ? `/api/admin/templates/${editTemplateId}` : '/api/admin/templates';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(isEditingTemplate ? 'Cập nhật template thành công' : 'Lưu template thành công');
        if (!isEditingTemplate) {
          setTemplateTitle('');
          setTemplateDescription('');
          setTemplateImageUrl('');
          setTemplateCategory('');
          setTemplateStatus('Active');
        } else {
          navigate('/admin?tab=templates');
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'Lưu template thất bại');
      }
    } catch (err) {
      toast.error('Lỗi kết nối, không thể lưu template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // ✅ Sửa: Thêm kiểu cho tham số
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, icon: any, color: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.setData('application/color', color);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ✅ Sửa: Thêm kiểu cho tham số
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');
      const color = event.dataTransfer.getData('application/color');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type: label === 'Scheduler' ? 'trigger' : 'action',
        position,
        data: { 
          label: label, 
          description: label === 'Scheduler' ? 'Run workflow on schedule' : `New ${label} Node`,
          icon: label,
          iconColor: color,
          onNodeClick,
          onDelete: onDeleteNode,
          cronExpression: label === 'Scheduler' ? '0 9 * * *' : undefined,
          systemPrompt: label === 'LLM' ? 'You are a helpful assistant.' : (label === 'AI Agent' ? 'You are a helpful AI agent.' : ''),
          userPrompt: '',
          selectedTools: [],
        },
      };

      setNodes((nds: Node[]) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, onNodeClick, onDeleteNode]
  );

  return (
    <div className="h-screen flex flex-col bg-[#f6f6f8] overflow-hidden">
      <header className="h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10">
        <div className="flex items-center gap-4">
          <Edit3 className="text-slate-400" size={18} />
          <div>
            <input
              className="text-sm font-bold bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#2b5bee] outline-none"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              {workflowId ? `ID: ${workflowId}` : 'Chưa lưu'} • Last edited just now
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveWorkflow}
            disabled={!isDirty || saving}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              !isDirty || saving
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {saving ? 'Saving...' : 'Save Workflow'}
          </button>
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="px-4 py-2 text-xs font-bold text-white bg-[#2b5bee] hover:bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            {isRunning ? 'Running...' : 'Run Workflow'}
          </button>
        </div>
      </header>

      {isAdmin && (
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Tiêu đề template *"
            value={templateTitle}
            onChange={(e) => setTemplateTitle(e.target.value)}
            className="px-3 py-2 border rounded w-64 text-sm"
          />
          <input
            type="text"
            placeholder="Mô tả template"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            className="px-3 py-2 border rounded w-80 text-sm"
          />
          <input
            type="text"
            placeholder="URL ảnh"
            value={templateImageUrl}
            onChange={(e) => setTemplateImageUrl(e.target.value)}
            className="px-3 py-2 border rounded w-64 text-sm"
          />
          <input
            type="text"
            placeholder="Danh mục"
            value={templateCategory}
            onChange={(e) => setTemplateCategory(e.target.value)}
            className="px-3 py-2 border rounded w-48 text-sm"
          />
          <select
            value={templateStatus}
            onChange={(e) => setTemplateStatus(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
          </select>
          <button
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm font-medium disabled:opacity-50"
          >
            {savingTemplate ? (isEditingTemplate ? 'Đang cập nhật...' : 'Đang lưu...') : (isEditingTemplate ? 'Cập nhật template' : 'Lưu thành template')}
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 flex flex-col bg-white border-r border-slate-200 z-20">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Nodes</h2>
            <p className="text-xs text-slate-400">Drag and drop components</p>
          </div>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto">
            {[
              { icon: Bot, label: 'AI Agent', color: 'text-purple-500' },
              { icon: Brain, label: 'LLM', color: 'text-emerald-500' },
              { icon: FileText, label: 'File Parser', color: 'text-indigo-500' },
              { icon: Clock, label: 'Scheduler', color: 'text-amber-500' },
            ].map((node, i) => (
              <div 
                key={i}
                draggable
                onDragStart={(e) => onDragStart(e, node.label, node.label, node.icon, node.color)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg border border-slate-200 bg-slate-50 cursor-grab hover:border-[#2b5bee] transition-colors group"
              >
                <node.icon className={node.color} size={18} />
                <span className="text-sm font-medium">{node.label}</span>
                <MoreHorizontal className="ml-auto text-slate-300 opacity-0 group-hover:opacity-100" size={16} />
              </div>
            ))}
          </div>
          <div className="mt-auto p-4">
            <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
              <Plus size={16} />
              Custom Node
            </button>
          </div>
        </aside>

        <div className="flex-1 relative overflow-hidden bg-[#f6f6f8]" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {activeModal?.type === 'action' && activeModal.data.label === 'LLM' ? (
        <LlmModal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          data={activeModal.data}
          nodeId={activeModal.nodeId}
          onSave={(newData) => onSaveNodeConfig(activeModal.nodeId, newData)}
        />
      ) : activeModal?.type === 'action' && activeModal.data.label === 'AI Agent' ? (
        <AiAgentModal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          data={activeModal.data}
          nodeId={activeModal.nodeId}
          onSave={(newData) => onSaveNodeConfig(activeModal.nodeId, newData)}
        />
      ) : activeModal?.type === 'action' && activeModal.data.label === 'File Parser' ? (
        <FileParserModal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          data={activeModal.data}
          nodeId={activeModal.nodeId}
          onSave={(newData) => onSaveNodeConfig(activeModal.nodeId, newData)}
        />
      ) : activeModal?.type === 'trigger' && activeModal.data.label === 'Scheduler' ? (
        <SchedulerModal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          data={activeModal.data}
          nodeId={activeModal.nodeId}
          onSave={(newData) => onSaveNodeConfig(activeModal.nodeId, newData)}
        />
      ) : null}
      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={() => setResultModal({ ...resultModal, isOpen: false })}
        success={resultModal.success}
        message={resultModal.message}
        output={resultModal.output}
      />
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}