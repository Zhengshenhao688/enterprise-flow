import { create } from "zustand";
import { nanoid } from "nanoid";

// =======================================================
// 工具函数
// =======================================================

/**
 * 将数值限制在指定区间内
 * @param value 当前值
 * @param min 最小值
 * @param max 最大值
 */
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

// =======================================================
// 节点尺寸（用于边界限制）
// 注意：这里是“节点盒子”占用尺寸（不含阴影），可按你的 NodeItem 实际样式调整
// =======================================================
const NODE_WIDTH = 100;
const NODE_HEIGHT = 50;

// =======================================================
// 类型定义
// =======================================================

export type AnchorType = "top" | "right" | "bottom" | "left";
export const anchorOffsets: Record<AnchorType, { x: number; y: number }> = {
  top: { x: 50, y: 0 },
  right: { x: 100, y: 50 },
  bottom: { x: 50, y: 100 },
  left: { x: 0, y: 50 },
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

// =======================================================
// Zustand Store 定义
// =======================================================

type FlowStore = {
  nodes: FlowNode[];
  edges: FlowEdge[];

  canvasSize: { width: number; height: number };
  worldSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;

  // 节点选中
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // 添加 & 更新节点
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, data: Partial<FlowNode>) => void;

  updateNodePosition: (id: string, position: { x: number; y: number }) => void;

  connectState: { mode: "idle" } | { mode: "connecting"; fromNodeId: string; fromAnchor: AnchorType };
  startConnect: (nodeId: string, anchor: AnchorType) => void;
  finishConnect: (toNodeId: string, anchor: AnchorType) => void;
  cancelConnect: () => void;
};

// =======================================================
// 实现
// =======================================================

export const useFlowStore = create<FlowStore>((set, get) => ({
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

          const x = clamp(
            position.x,
            0,
            Math.max(0, width - NODE_WIDTH)
          );

          const y = clamp(
            position.y,
            0,
            Math.max(0, height - NODE_HEIGHT)
          );

          return {
            ...n,
            position: { x, y },
          };
        }),
      };
    }),

  connectState: { mode: "idle" },

  startConnect: (nodeId, anchor) => {
    set({ connectState: { mode: "connecting", fromNodeId: nodeId, fromAnchor: anchor } });
  },

  finishConnect: (toNodeId, anchor) => {
    const connectState = get().connectState;
    if (connectState.mode !== "connecting") return;

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
    }));
  },

  cancelConnect: () => {
    set({ connectState: { mode: "idle" } });
  },
}));
  

