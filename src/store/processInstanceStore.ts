import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProcessDefinition } from "./flowStore";

// 🆕 1. 定义审批日志结构
export type ApprovalLog = {
  date: number;
  action: "submit" | "approve" | "reject";
  operator: string; // 操作人 (例如: "张三", "管理员")
  comment?: string; // 审批意见
};

export type InstanceStatus = "running" | "approved" | "rejected";

export type ProcessInstance = {
  instanceId: string;
  processDefinitionId: string;
  currentNodeId: string | null;
  status: InstanceStatus;
  definitionSnapshot: ProcessDefinition;
  createdAt: number;
  formData?: Record<string, unknown>;
  // 🆕 2. 新增日志数组
  logs: ApprovalLog[];
};

type ProcessInstanceStore = {
  instances: Record<string, ProcessInstance>;
  startProcess: (definition: ProcessDefinition, formData?: Record<string, unknown>) => string;
  getInstanceById: (instanceId: string) => ProcessInstance | undefined;
  approve: (instanceId: string, operator?: string) => void;
  // 🆕 3. 新增拒绝方法
  reject: (instanceId: string, operator?: string) => void;
};

export const useProcessInstanceStore = create<ProcessInstanceStore>()(
  persist(
    (set, get) => ({
      instances: {},

      startProcess: (definition: ProcessDefinition, formData = {}) => {
        const startNode = definition.nodes.find((n) => n.type === "start");
        const newInstanceId = nanoid();
        const now = Date.now();

        const newInstance: ProcessInstance = {
          instanceId: newInstanceId,
          processDefinitionId: definition.id,
          currentNodeId: startNode ? startNode.id : null,
          status: "running",
          definitionSnapshot: definition,
          createdAt: now,
          formData: formData,
          // 🆕 4. 初始化日志
          logs: [
            {
              date: now,
              action: "submit",
              operator: "申请人", // 实际项目中应从 AuthStore 获取
              comment: "发起流程申请",
            },
          ],
        };

        set((state) => ({
          instances: { ...state.instances, [newInstanceId]: newInstance },
        }));
        return newInstanceId;
      },

      getInstanceById: (instanceId: string) => {
        const { instances } = get();
        return instances[instanceId];
      },

      approve: (instanceId: string, operator = "管理员") => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance || instance.status !== "running") return state;

          const { currentNodeId, definitionSnapshot } = instance;
          const outgoingEdge = definitionSnapshot.edges.find((edge) => edge.from.nodeId === currentNodeId);
          
          if (!outgoingEdge) return state;

          const nextNodeId = outgoingEdge.to.nodeId;
          const nextNode = definitionSnapshot.nodes.find((n) => n.id === nextNodeId);

          let newStatus: InstanceStatus = "running";
          if (nextNode && nextNode.type === "end") {
            newStatus = "approved";
          }

          // 🆕 5. 记录通过日志
          const newLog: ApprovalLog = {
            date: Date.now(),
            action: "approve",
            operator,
            comment: newStatus === "approved" ? "审批通过，流程结束" : "审批通过，进入下一节点",
          };

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                currentNodeId: nextNodeId,
                status: newStatus,
                logs: [...instance.logs, newLog],
              },
            },
          };
        });
      },

      // 🆕 6. 实现拒绝逻辑
      reject: (instanceId: string, operator = "管理员") => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance || instance.status !== "running") return state;

          // 记录拒绝日志
          const newLog: ApprovalLog = {
            date: Date.now(),
            action: "reject",
            operator,
            comment: "拒绝申请，流程终止",
          };

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                status: "rejected", // 状态变为已拒绝
                currentNodeId: null, // 流程结束，无当前节点
                logs: [...instance.logs, newLog],
              },
            },
          };
        });
      },
    }),
    {
      name: "enterprise-instance-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);