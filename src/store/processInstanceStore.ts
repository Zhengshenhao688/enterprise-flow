import { create } from "zustand";
import { nanoid } from "nanoid";
import type { ProcessDefinition } from "./flowStore";

export type InstanceStatus = "running" | "approved" | "rejected";

export type ProcessInstance = {
  instanceId: string;
  processDefinitionId: string;
  currentNodeId: string | null;
  status: InstanceStatus;
  definitionSnapshot: ProcessDefinition;
  createdAt: number;
  /** 🆕 新增：业务表单数据 */
  formData?: Record<string, unknown>;
};

type ProcessInstanceStore = {
  instances: Record<string, ProcessInstance>;
  /** 🆕 修改：startProcess 增加 formData 参数 */
  startProcess: (definition: ProcessDefinition, formData?: Record<string, unknown>) => string;
  getInstanceById: (instanceId: string) => ProcessInstance | undefined;
  approve: (instanceId: string) => void;
};

export const useProcessInstanceStore = create<ProcessInstanceStore>((set, get) => ({
  instances: {},

  // 🆕 修改：接收 formData
  startProcess: (definition: ProcessDefinition, formData = {}) => {
    const startNode = definition.nodes.find((n) => n.type === "start");
    const newInstanceId = nanoid();

    const newInstance: ProcessInstance = {
      instanceId: newInstanceId,
      processDefinitionId: definition.id,
      currentNodeId: startNode ? startNode.id : null,
      status: "running",
      definitionSnapshot: definition,
      createdAt: Date.now(),
      // 🆕 记录表单数据
      formData: formData, 
    };

    set((state) => ({
      instances: {
        ...state.instances,
        [newInstanceId]: newInstance,
      },
    }));

    console.log(`[Process] 实例创建成功: ${newInstanceId}, 携带数据:`, formData);
    return newInstanceId;
  },

  getInstanceById: (instanceId: string) => {
    const { instances } = get();
    return instances[instanceId];
  },

  approve: (instanceId: string) => {
    // ... (保持原有 approve 逻辑不变，此处省略以节省篇幅) ...
    // 为保证代码完整性，请保留原有的 approve 实现
    set((state) => {
      const instance = state.instances[instanceId];
      if (!instance || instance.status !== "running") return state;
      const { currentNodeId, definitionSnapshot } = instance;
      const outgoingEdge = definitionSnapshot.edges.find((edge) => edge.from.nodeId === currentNodeId);
      if (!outgoingEdge) return state;
      const nextNodeId = outgoingEdge.to.nodeId;
      const nextNode = definitionSnapshot.nodes.find((n) => n.id === nextNodeId);
      let newStatus: InstanceStatus = "running";
      if (nextNode && nextNode.type === "end") newStatus = "approved";
      return {
        instances: {
          ...state.instances,
          [instanceId]: { ...instance, currentNodeId: nextNodeId, status: newStatus },
        },
      };
    });
  },
}));