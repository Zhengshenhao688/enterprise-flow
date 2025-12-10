import { create } from "zustand";
import { nanoid } from "nanoid";

// =======================================================
// 类型定义
// =======================================================

export type AnchorType = "top" | "right" | "bottom" | "left";

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

// 临时连线草稿
export type ConnectionDraft = {
  fromNodeId: string;
  fromAnchor: AnchorType;
  mouseX: number;
  mouseY: number;
} | null;

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

  // 连线系统
  connectionDraft: ConnectionDraft;
  startConnect: (nodeId: string, anchor: AnchorType) => void;
  updateDraft: (mouseX: number, mouseY: number) => void;
  endConnect: (toNodeId: string | null, anchor: AnchorType | null) => void;
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

  // ========================
  // 连线逻辑
  // ========================
  connectionDraft: null,

  startConnect: (nodeId, anchor) =>
    set({
      connectionDraft: {
        fromNodeId: nodeId,
        fromAnchor: anchor,
        mouseX: 0,
        mouseY: 0,
      },
    }),

  updateDraft: (mouseX, mouseY) => {
    const draft = get().connectionDraft;
    if (!draft) return;

    set({
      connectionDraft: {
        ...draft,
        mouseX,
        mouseY,
      },
    });
  },

  endConnect: (toNodeId, anchor) => {
    const draft = get().connectionDraft;
    if (!draft) return;

    // 无效就取消
    if (!toNodeId || !anchor) {
      set({ connectionDraft: null });
      return;
    }

    // 创建新连线
    const newEdge: FlowEdge = {
      id: nanoid(),
      from: {
        nodeId: draft.fromNodeId,
        anchor: draft.fromAnchor,
      },
      to: {
        nodeId: toNodeId,
        anchor,
      },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
      connectionDraft: null,
    }));
  },
}));