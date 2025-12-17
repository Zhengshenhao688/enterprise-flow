import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";

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
    case "top":
      return { x: x + NODE_WIDTH / 2, y: y };
    case "right":
      return { x: x + NODE_WIDTH, y: y + NODE_HEIGHT / 2 };
    case "bottom":
      return { x: x + NODE_WIDTH / 2, y: y + NODE_HEIGHT };
    case "left":
      return { x: x, y: y + NODE_HEIGHT / 2 };
    default:
      return { x, y };
  }
}

// =======================================================
// 类型定义
// =======================================================

export type AnchorType = "top" | "right" | "bottom" | "left";

export type Point = { x: number; y: number };

export type NodeConfig = {
  approverRole?: string;
};

export type FlowNode = {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  config?: NodeConfig;
};

export type FlowEdge = {
  id: string;
  from: { nodeId: string; anchor: AnchorType };
  to: { nodeId: string; anchor: AnchorType };
};

export type ProcessDefinition = {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type ConnectState =
  | { mode: "idle" }
  | { 
      mode: "connecting"; 
      fromNodeId: string; 
      fromAnchor: AnchorType;
      // 🆕 新增：记录鼠标当前位置，用于画橡皮筋线
      cursorPosition?: { x: number; y: number } 
    };

// ================== Store 定义 ==================

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
  
  // 🆕 选中连线ID
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, data: Partial<FlowNode>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  
  deleteSelected: () => void;

  connectState: ConnectState;
  startConnect: (nodeId: string, anchor: AnchorType) => void;
  // 🆕 更新连接时的鼠标位置
  updateConnectCursor: (position: { x: number; y: number }) => void;
  finishConnect: (toNodeId: string, anchor: AnchorType) => void;
  cancelConnect: () => void;

  getProcessDefinition: () => ProcessDefinition;

  publishedFlows: ProcessDefinition[];
  publishFlow: () => void;
  resetFlow: () => void;
  loadFlow: (flow: ProcessDefinition) => void;
};

// =======================================================
// Store 实现
// =======================================================

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
          worldSize: {
            width: Math.max(size.width, 2000),
            height: Math.max(size.height, 1200),
          },
        })),

      viewportOffset: { x: 0, y: 0 },
      setViewportOffset: (offset) => set({ viewportOffset: offset }),
      
      selectedNodeId: null,
      setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }), // 互斥
      
      selectedEdgeId: null,
      setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }), // 互斥

      addNode: (node) =>
        set((state) => ({
          nodes: [...state.nodes, node],
        })),

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
        
        // 删除节点
        if (selectedNodeId) {
          const newNodes = nodes.filter(n => n.id !== selectedNodeId);
          const newEdges = edges.filter(
            edge => edge.from.nodeId !== selectedNodeId && edge.to.nodeId !== selectedNodeId
          );
          set({
            nodes: newNodes,
            edges: newEdges,
            selectedNodeId: null
          });
          return;
        }

        // 删除连线
        if (selectedEdgeId) {
          const newEdges = edges.filter(edge => edge.id !== selectedEdgeId);
          set({
            edges: newEdges,
            selectedEdgeId: null
          });
        }
      },

      connectState: { mode: "idle" },

      startConnect: (nodeId, anchor) => {
        set({
          connectState: {
            mode: "connecting",
            fromNodeId: nodeId,
            fromAnchor: anchor,
            cursorPosition: undefined,
          },
        });
      },

      updateConnectCursor: (position) => {
        const { connectState } = get();
        if (connectState.mode === "connecting") {
          set({
            connectState: {
              ...connectState,
              cursorPosition: position,
            }
          });
        }
      },

      finishConnect: (toNodeId, anchor) => {
        const { connectState, nodes, edges } = get();
        if (connectState.mode !== "connecting") return;
        
        const fromNodeId = connectState.fromNodeId;

        if (fromNodeId === toNodeId) {
          set({ connectState: { mode: "idle" } });
          return;
        }

        const exists = edges.some(edge => 
          edge.from.nodeId === fromNodeId && edge.to.nodeId === toNodeId
        );
        if (exists) {
           set({ connectState: { mode: "idle" } });
           return;
        }

        const fromNode = nodes.find(n => n.id === fromNodeId);
        const toNode = nodes.find(n => n.id === toNodeId);

        if (fromNode?.type === 'end') {
          set({ connectState: { mode: "idle" } });
          return;
        }

        if (toNode?.type === 'start') {
          set({ connectState: { mode: "idle" } });
          return;
        }

        const newEdge: FlowEdge = {
          id: nanoid(),
          from: { nodeId: fromNodeId, anchor: connectState.fromAnchor },
          to: { nodeId: toNodeId, anchor },
        };

        set((state) => ({
          edges: [...state.edges, newEdge],
          connectState: { mode: "idle" },
          selectedNodeId: null,
          selectedEdgeId: null,
        }));
      },

      cancelConnect: () => {
        set({ connectState: { mode: "idle" } });
      },

      getProcessDefinition: () => {
        const { processId, processName, nodes, edges } = get();
        return {
          id: processId,
          name: processName,
          nodes,
          edges,
        };
      },

      publishedFlows: [],
      
      publishFlow: () => {
        const { processId, processName, nodes, edges } = get();
        const newDefinition: ProcessDefinition = {
          id: processId,
          name: processName,
          nodes,
          edges,
        };

        set((state) => {
          const others = state.publishedFlows.filter((f) => f.id !== processId);
          return {
            publishedFlows: [...others, newDefinition],
          };
        });
      },

      resetFlow: () => {
        set({
          processId: nanoid(),
          processName: "新业务流程",
          nodes: [],
          edges: [],
          selectedNodeId: null,
          selectedEdgeId: null,
        });
      },

      loadFlow: (flow) => {
        set({
          processId: flow.id,
          processName: flow.name,
          nodes: flow.nodes,
          edges: flow.edges,
          selectedNodeId: null,
          selectedEdgeId: null,
        });
      },
    }),
    {
      name: "enterprise-flow-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        processId: state.processId,
        processName: state.processName,
        nodes: state.nodes,
        edges: state.edges,
        publishedFlows: state.publishedFlows,
      }),
    }
  )
);