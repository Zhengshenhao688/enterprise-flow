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

// 纯逻辑计算锚点坐标
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
// 类型定义 (Type Definitions)
// =======================================================

export type AnchorType = "top" | "right" | "bottom" | "left";

export type Point = {
  x: number;
  y: number;
};

/**
 * 节点业务配置信息
 */
export type NodeConfig = {
  /** 指定该节点由哪个角色审批 (例如 "admin", "hr", "manager") */
  approverRole?: string;
};

export type FlowNode = {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  /** 节点的配置数据 (可选) */
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

// ================== 连线状态 ==================

export type ConnectState =
  | { mode: "idle" }
  | { mode: "connecting"; fromNodeId: string; fromAnchor: AnchorType };

// ================== Zustand Store 定义 ==================

type FlowStore = {
  // --- 流程元数据 ---
  processId: string;
  processName: string;
  setProcessName: (name: string) => void;

  // --- 画布核心数据 ---
  nodes: FlowNode[];
  edges: FlowEdge[];
  
  // --- 画布视图状态 ---
  canvasSize: { width: number; height: number };
  worldSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;
  viewportOffset: Point;
  setViewportOffset: (offset: Point) => void;
  
  // --- 交互状态 ---
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  
  // --- 节点操作 ---
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, data: Partial<FlowNode>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  
  // --- 连线操作 ---
  connectState: ConnectState;
  startConnect: (nodeId: string, anchor: AnchorType) => void;
  finishConnect: (toNodeId: string, anchor: AnchorType) => void;
  cancelConnect: () => void;

  // --- 数据导出 ---
  getProcessDefinition: () => ProcessDefinition;

  // --- 🆕 流程模板管理 (Step 1 新增) ---
  publishedFlows: ProcessDefinition[]; // 已发布的流程模板库
  publishFlow: () => void;             // 将当前画布保存为模板
};

// =======================================================
// Store 实现
// =======================================================

export const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => ({
      // 初始化元数据
      processId: nanoid(),
      processName: "未命名流程",
      setProcessName: (name) => set({ processName: name }),

      nodes: [],
      edges: [],
      canvasSize: { width: 0, height: 0 },
      worldSize: { width: 0, height: 0 },

      setCanvasSize: (size) =>
        set(() => {
          const MIN_WORLD_WIDTH = 2000;
          const MIN_WORLD_HEIGHT = 1200;
          return {
            canvasSize: size,
            worldSize: {
              width: Math.max(size.width, MIN_WORLD_WIDTH),
              height: Math.max(size.height, MIN_WORLD_HEIGHT),
            },
          };
        }),

      viewportOffset: { x: 0, y: 0 },
      setViewportOffset: (offset) => set({ viewportOffset: offset }),
      selectedNodeId: null,
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

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

      connectState: { mode: "idle" },

      startConnect: (nodeId, anchor) => {
        set({
          connectState: {
            mode: "connecting",
            fromNodeId: nodeId,
            fromAnchor: anchor,
          },
        });
      },

      finishConnect: (toNodeId, anchor) => {
        const connectState = get().connectState;
        if (connectState.mode !== "connecting") return;
        
        // 禁止自连
        if (connectState.fromNodeId === toNodeId) {
          set({ connectState: { mode: "idle" } });
          return;
        }

        const newEdge: FlowEdge = {
          id: nanoid(),
          from: { nodeId: connectState.fromNodeId, anchor: connectState.fromAnchor },
          to: { nodeId: toNodeId, anchor },
        };

        set((state) => ({
          edges: [...state.edges, newEdge],
          connectState: { mode: "idle" },
          selectedNodeId: null,
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

      // --- 🆕 Step 1: 流程模板管理实现 ---
      publishedFlows: [],
      
      publishFlow: () => {
        const { processId, processName, nodes, edges } = get();
        
        // 1. 构建当前画布的蓝图
        const newDefinition: ProcessDefinition = {
          id: processId,
          name: processName,
          nodes,
          edges,
        };

        // 2. 存入 publishedFlows (Upsert 逻辑: ID相同则覆盖)
        set((state) => {
          const others = state.publishedFlows.filter((f) => f.id !== processId);
          return {
            publishedFlows: [...others, newDefinition],
          };
        });

        console.log("✅ 流程模板已发布:", newDefinition);
      },
    }),
    {
      name: "enterprise-flow-storage", 
      storage: createJSONStorage(() => localStorage),
      // ⚠️ 更新持久化白名单，加上 publishedFlows
      partialize: (state) => ({
        processId: state.processId,
        processName: state.processName,
        nodes: state.nodes,
        edges: state.edges,
        publishedFlows: state.publishedFlows, // 新增
      }),
    }
  )
);