import { create } from 'zustand';

export interface FlowNode {
  id: string;
  type: string;
  x: number;
  y: number;
}

interface FlowState {
  nodes: FlowNode[];
  addNode: (node: FlowNode) => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  nodes: [],

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),
}));