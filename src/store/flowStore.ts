// flowStore.ts
import { create } from "zustand";
import { nanoid } from "nanoid";

// =======================================================
// 工具函数 & 常量
// =======================================================

export const NODE_WIDTH = 100;
export const NODE_HEIGHT = 50;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

// ⭐ 新增：纯逻辑计算锚点坐标（不再依赖 DOM）
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

export type Point = {
  x: number;
  y: number;
};

export type FlowNode = {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
};

export type FlowEdge = {
  id: string;
  from: { nodeId: string; anchor: AnchorType };
  to: { nodeId: string; anchor: AnchorType };
};

// ================== 连线状态 ==================

export type ConnectState =
  | { mode: "idle" }
  | { mode: "connecting"; fromNodeId: string; fromAnchor: AnchorType };

// ================== Zustand Store 定义 ==================

type FlowStore = {
  // ---------- 节点 & 边 ----------
  nodes: FlowNode[];
  edges: FlowEdge[];

  // ---------- 画布 / 世界 ----------
  canvasSize: { width: number; height: number };
  worldSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;

  // ---------- ⭐ 视口（Pan） ----------
  viewportOffset: Point;
  setViewportOffset: (offset: Point) => void;

  // ---------- 选中 ----------
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // ---------- 节点操作 ----------
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, data: Partial<FlowNode>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;

  // ---------- 连线 ----------
  connectState: ConnectState;
  startConnect: (nodeId: string, anchor: AnchorType) => void;
  finishConnect: (toNodeId: string, anchor: AnchorType) => void;
  cancelConnect: () => void;
};

// =======================================================
// Store 实现
// =======================================================

export const useFlowStore = create<FlowStore>((set, get) => ({
  // ================= 节点 / 边 =================
  nodes: [],
  edges: [],

  // ================= 画布 / 世界 =================
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

  // ================= ⭐ 视口（Pan） =================
  viewportOffset: { x: 0, y: 0 },
  setViewportOffset: (offset) => set({ viewportOffset: offset }),

  // ================= 选中 =================
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // ================= 节点操作 =================
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

          return {
            ...n,
            position: { x, y },
          };
        }),
      };
    }),

  // ================= 连线状态 =================
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

    // 防止自己连自己
    if (connectState.fromNodeId === toNodeId) {
      set({ connectState: { mode: "idle" } });
      return;
    }

    const newEdge: FlowEdge = {
      id: nanoid(),
      from: {
        nodeId: connectState.fromNodeId,
        anchor: connectState.fromAnchor,
      },
      to: {
        nodeId: toNodeId,
        anchor,
      },
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
}));