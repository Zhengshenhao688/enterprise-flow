import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
// ✅ 核心修复：使用 import type 解决 verbatimModuleSyntax 报错
import type { FlowNode, FlowEdge, ProcessDefinition, AnchorType,CreateFlowNode } from "../types/flow";

// =======================================================
// 工具函数 & 常量
// =======================================================
export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 60;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function getAnchorCoordinate(position: { x: number; y: number }, anchor: AnchorType) {
  const { x, y } = position;
  switch (anchor) {
    case "top": return { x: x + NODE_WIDTH / 2, y: y };
    case "right": return { x: x + NODE_WIDTH, y: y + NODE_HEIGHT / 2 };
    case "bottom": return { x: x + NODE_WIDTH / 2, y: y + NODE_HEIGHT };
    case "left": return { x: x, y: y + NODE_HEIGHT / 2 };
    default: return { x, y };
  }
}

export type Point = { x: number; y: number };

export type ConnectState =
  | { mode: "idle" }
  | { 
      mode: "connecting"; 
      fromNodeId: string; 
      fromAnchor: AnchorType;
      cursorPosition?: { x: number; y: number } 
    };

type FlowStore = {
  processId: string;
  processName: string;
  setProcessName: (name: string) => void;
  nodes: FlowNode[];
  edges: FlowEdge[];
  canvasSize: { width: number; height: number };
  worldSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;
  viewportOffset: Point;
  setViewportOffset: (offset: Point) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  addNode: (node: CreateFlowNode) => void;
  updateNode: (id: string, data: Partial<FlowNode>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  deleteSelected: () => void;
  connectState: ConnectState;
  startConnect: (nodeId: string, anchor: AnchorType) => void;
  updateConnectCursor: (position: { x: number; y: number }) => void;
  finishConnect: (toNodeId: string, anchor: AnchorType) => void;
  cancelConnect: () => void;
  getProcessDefinition: () => ProcessDefinition;
  validateFlow: () => { success: boolean; error?: string };
  publishedFlows: ProcessDefinition[];
  publishFlow: () => void;
  resetFlow: () => void;
  loadFlow: (flow: ProcessDefinition) => void;
};

export const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => ({
      processId: nanoid(),
      processName: "未命名流程",
      setProcessName: (name) => set({ processName: name }),
      nodes: [],
      edges: [],
      canvasSize: { width: 0, height: 0 },
      worldSize: { width: 0, height: 0 },
      setCanvasSize: (size) =>
        set(() => ({
          canvasSize: size,
          worldSize: { width: Math.max(size.width, 2000), height: Math.max(size.height, 1200) },
        })),
      viewportOffset: { x: 0, y: 0 },
      setViewportOffset: (offset) => set({ viewportOffset: offset }),
      selectedNodeId: null,
      setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
      selectedEdgeId: null,
      setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

      addNode: (node) =>
        set((state) => {
          const newNode: FlowNode = {
            ...node,
            config: {
              // 旧字段兼容（如果是老流程）
              approverRole: node.config?.approverRole,

              // 新字段：多审批角色（定义态）
              approverRoles:
                node.config?.approverRoles ??
                (node.config?.approverRole ? [node.config.approverRole] : ['hr']),

              // 审批模式：默认或签
              approvalMode: node.config?.approvalMode ?? 'MATCH_ANY',

              // 运行态字段（此阶段仅初始化）
              processedUsers: [],
            }
          };
          return { nodes: [...state.nodes, newNode] };
        }),

      updateNode: (id, data) =>
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)),
        })),

      updateNodePosition: (id, position) =>
        set((state) => {
          const { width, height } = state.worldSize;
          return {
            nodes: state.nodes.map((n) => {
              if (n.id !== id) return n;
              const x = clamp(position.x, 0, Math.max(0, width - NODE_WIDTH));
              const y = clamp(position.y, 0, Math.max(0, height - NODE_HEIGHT));
              return { ...n, position: { x, y } };
            }),
          };
        }),

      deleteSelected: () => {
        const { selectedNodeId, selectedEdgeId, nodes, edges } = get();
        if (selectedNodeId) {
          const newNodes = nodes.filter(n => n.id !== selectedNodeId);
          const newEdges = edges.filter(edge => edge.from.nodeId !== selectedNodeId && edge.to.nodeId !== selectedNodeId);
          set({ nodes: newNodes, edges: newEdges, selectedNodeId: null });
          return;
        }
        if (selectedEdgeId) {
          set({ edges: edges.filter(edge => edge.id !== selectedEdgeId), selectedEdgeId: null });
        }
      },

      connectState: { mode: "idle" },
      startConnect: (nodeId, anchor) => set({ connectState: { mode: "connecting", fromNodeId: nodeId, fromAnchor: anchor, cursorPosition: undefined } }),
      updateConnectCursor: (position) => {
        const { connectState } = get();
        if (connectState.mode === "connecting") set({ connectState: { ...connectState, cursorPosition: position } });
      },
      finishConnect: (toNodeId, anchor) => {
        const { connectState, nodes, edges } = get();
        if (connectState.mode !== "connecting") return;
        const fromNodeId = connectState.fromNodeId;
        if (fromNodeId === toNodeId || edges.some(e => e.from.nodeId === fromNodeId && e.to.nodeId === toNodeId)) {
          set({ connectState: { mode: "idle" } }); return;
        }
        const fromNode = nodes.find(n => n.id === fromNodeId);
        const toNode = nodes.find(n => n.id === toNodeId);
        if (fromNode?.type === 'end' || toNode?.type === 'start') { set({ connectState: { mode: "idle" } }); return; }

        const newEdge: FlowEdge = { id: nanoid(), from: { nodeId: fromNodeId, anchor: connectState.fromAnchor }, to: { nodeId: toNodeId, anchor } };
        set((state) => ({ edges: [...state.edges, newEdge], connectState: { mode: "idle" }, selectedNodeId: null, selectedEdgeId: null }));
      },
      cancelConnect: () => set({ connectState: { mode: "idle" } }),
      getProcessDefinition: () => { const { processId, processName, nodes, edges } = get(); return { id: processId, name: processName, nodes, edges }; },
      
      // ✅ 修复：实现完整的校验逻辑以使用 edges 变量
      validateFlow: () => {
        const { nodes, edges } = get();
        const startNode = nodes.find(n => n.type === 'start');
        const endNode = nodes.find(n => n.type === 'end');
        
        if (!startNode || !endNode) return { success: false, error: '缺少发起人或结束节点' };

        // BFS 连通性校验
        const adj = new Map<string, string[]>();
        nodes.forEach(n => adj.set(n.id, []));
        edges.forEach(e => {
          const list = adj.get(e.from.nodeId);
          if (list) list.push(e.to.nodeId);
        });

        const queue = [startNode.id];
        const visited = new Set<string>([startNode.id]);
        let reachedEnd = false;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (curr === endNode.id) reachedEnd = true;
          (adj.get(curr) || []).forEach(next => {
            if (!visited.has(next)) {
              visited.add(next);
              queue.push(next);
            }
          });
        }

        if (!reachedEnd) return { success: false, error: '流程未闭环：无法从发起人到达结束节点' };
        return { success: true };
      },

      publishedFlows: [],
      publishFlow: () => {
        const def = get().getProcessDefinition();
        set((state) => ({ publishedFlows: [...state.publishedFlows.filter(f => f.id !== def.id), def] }));
      },
      resetFlow: () => set({ processId: nanoid(), processName: "新业务流程", nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null }),
      loadFlow: (flow) => set({ processId: flow.id, processName: flow.name, nodes: flow.nodes, edges: flow.edges, selectedNodeId: null, selectedEdgeId: null }),
    }),
    {
      name: "enterprise-flow-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ processId: state.processId, processName: state.processName, nodes: state.nodes, edges: state.edges, publishedFlows: state.publishedFlows }),
    }
  )
);

