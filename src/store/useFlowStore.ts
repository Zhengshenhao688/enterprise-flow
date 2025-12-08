import { create } from 'zustand';

export interface FlowNode {
  id: string;
  type: string;
  x: number;
  y: number;
}

interface FlowState {
  nodes: FlowNode[];
  selectedNodeId: string | null;
  addNode: (node: FlowNode) => void;
  setSelectedNode: (id: string | null) => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  nodes: [],
  selectedNodeId: null,
  setSelectedNode: (id: string | null) =>
    set(() => ({
      selectedNodeId: id,
    })),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),
}));