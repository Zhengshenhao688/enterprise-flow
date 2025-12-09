import { create } from 'zustand';

export type FlowNode = {
  id: string;
  type: string;
  name: string;       // ⭐ 新增：节点名称
  position: { x: number; y: number };
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
};

type FlowStore = {
  nodes: FlowNode[];
  edges: FlowEdge[];

  selectedNodeId: string | null; // ⭐ 当前选中的节点
  setSelectedNodeId: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void; // ⭐ 新增方法

  addNode: (node: FlowNode) => void;
  updateNode: (id: string, data: Partial<FlowNode>) => void; // ⭐ 局部更新节点
};

export const useFlowStore = create<FlowStore>((set) => ({
  nodes: [],
  edges: [],

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedNode: (id) => set({ selectedNodeId: id }), // ⭐ 新增实现

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, ...data } : n
      ),
    })),
}));