import { create } from "zustand";
import { nanoid } from "nanoid";

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
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position } : n
      ),
    })),

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
