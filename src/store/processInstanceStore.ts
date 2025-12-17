import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProcessDefinition } from "./flowStore";

// =======================================================
// 类型定义
// =======================================================

export type InstanceStatus = "running" | "approved" | "rejected";

export type ProcessInstance = {
  instanceId: string;
  processDefinitionId: string;
  currentNodeId: string | null;
  status: InstanceStatus;
  definitionSnapshot: ProcessDefinition;
  createdAt: number;
  /** 业务表单数据 */
  formData?: Record<string, unknown>;
};

type ProcessInstanceStore = {
  instances: Record<string, ProcessInstance>;
  startProcess: (definition: ProcessDefinition, formData?: Record<string, unknown>) => string;
  getInstanceById: (instanceId: string) => ProcessInstance | undefined;
  approve: (instanceId: string) => void;
};

// =======================================================
// Store 实现 (带持久化)
// =======================================================

export const useProcessInstanceStore = create<ProcessInstanceStore>()(
  persist(
    (set, get) => ({
      instances: {},

      startProcess: (definition: ProcessDefinition, formData = {}) => {
        // 1. 寻找 Start 节点作为起始点
        const startNode = definition.nodes.find((n) => n.type === "start");
        const newInstanceId = nanoid();

        // 2. 构建实例对象
        const newInstance: ProcessInstance = {
          instanceId: newInstanceId,
          processDefinitionId: definition.id,
          currentNodeId: startNode ? startNode.id : null,
          status: "running",
          definitionSnapshot: definition,
          createdAt: Date.now(),
          formData: formData, 
        };

        // 3. 存入 Store
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
        set((state) => {
          const instance = state.instances[instanceId];
          
          if (!instance || instance.status !== "running") {
            console.warn("❌ 审批失败：实例不存在或状态不是 running");
            return state;
          }

          const { currentNodeId, definitionSnapshot } = instance;
          
          // 查找连线
          const outgoingEdge = definitionSnapshot.edges.find(
            (edge) => edge.from.nodeId === currentNodeId
          );

          if (!outgoingEdge) {
            console.warn(`❌ 审批失败：节点 [${currentNodeId}] 没有找到向下的连线`);
            return state;
          }

          const nextNodeId = outgoingEdge.to.nodeId;
          const nextNode = definitionSnapshot.nodes.find((n) => n.id === nextNodeId);

          let newStatus: InstanceStatus = "running";
          if (nextNode && nextNode.type === "end") {
            newStatus = "approved";
          }

          console.log(`✅ 审批成功：从 [${currentNodeId}] -> [${nextNodeId}], 新状态: ${newStatus}`);

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                currentNodeId: nextNodeId,
                status: newStatus,
              },
            },
          };
        });
      },
    }),
    {
      name: "enterprise-instance-storage", // localStorage 中的 Key
      storage: createJSONStorage(() => localStorage),
    }
  )
);