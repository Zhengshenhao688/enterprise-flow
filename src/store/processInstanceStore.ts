import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProcessDefinition } from "../types/flow";

// 1. 定义审批日志结构
export type ApprovalLog = {
  date: number;
  action: "submit" | "approve" | "reject";
  operator: string; 
  comment?: string; 
};

export type InstanceStatus = "running" | "approved" | "rejected";

export type ProcessInstance = {
  instanceId: string;
  processDefinitionId: string;
  currentNodeId: string | null;
  status: InstanceStatus;
  // 此处的定义现在自动包含了 approvalMode 和 processedUsers [cite: 224]
  definitionSnapshot: ProcessDefinition; 
  createdAt: number;
  formData?: Record<string, unknown>;
  logs: ApprovalLog[];
};

type ProcessInstanceStore = {
  instances: Record<string, ProcessInstance>;
  startProcess: (definition: ProcessDefinition, formData?: Record<string, unknown>) => string;
  getInstanceById: (instanceId: string) => ProcessInstance | undefined;
  approve: (instanceId: string, operator?: string) => void;
  reject: (instanceId: string, operator?: string) => void;
};

export const useProcessInstanceStore = create<ProcessInstanceStore>()(
  persist(
    (set, get) => ({
      instances: {},

      startProcess: (definition, formData = {}) => {
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
          logs: [
            {
              date: now,
              action: "submit",
              operator: "申请人", 
              comment: "发起流程申请",
            },
          ],
        };

        set((state) => ({
          instances: { ...state.instances, [newInstanceId]: newInstance },
        }));
        return newInstanceId;
      },

      getInstanceById: (instanceId) => {
        const { instances } = get();
        return instances[instanceId];
      },

      // ✅ 任务 1：重构审批流转算法 (Logic Layer)
      approve: (instanceId, operator = "管理员") => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance || instance.status !== "running") return state;

          const { currentNodeId, definitionSnapshot } = instance;
          
          // 1. 找到当前节点及其配置 [cite: 232]
          const currentNode = definitionSnapshot.nodes.find(n => n.id === currentNodeId);
          if (!currentNode) return state;

          const { approvalMode, approverList } = currentNode.config;
          const processedUsers = currentNode.config.processedUsers || [];

          // 防止同一人重复审批
          if (processedUsers.includes(operator)) return state;

          // 记录本次审批人员
          const updatedProcessedUsers = [...processedUsers, operator];

          // 更新节点快照中的 processedUsers
          const updatedNodes = definitionSnapshot.nodes.map(n => 
            n.id === currentNodeId 
              ? { ...n, config: { ...n.config, processedUsers: updatedProcessedUsers } }
              : n
          );
          
          const updatedSnapshot = { ...definitionSnapshot, nodes: updatedNodes };

          // 2. 判定是否满足流转条件
          let shouldMoveToNext = false;
          if (approvalMode === 'MATCH_ANY') {
            shouldMoveToNext = true; // 或签：有一人通过即可流转
          } else if (approvalMode === 'MATCH_ALL') {
            // 会签：需要所有审批人都通过
            // 判定条件：当前已投过票的人数 >= 预设审批人总数
            shouldMoveToNext = updatedProcessedUsers.length >= (approverList?.length || 1);
          }

          // 3. 根据判定结果执行流转或仅保存状态
          if (shouldMoveToNext) {
            // 满足流转条件：寻找下一节点 [cite: 232]
            const outgoingEdge = definitionSnapshot.edges.find((edge) => edge.from.nodeId === currentNodeId);
            if (!outgoingEdge) return state;

            const nextNodeId = outgoingEdge.to.nodeId;
            const nextNode = definitionSnapshot.nodes.find((n) => n.id === nextNodeId);

            let newStatus: InstanceStatus = "running";
            if (nextNode && nextNode.type === "end") {
              newStatus = "approved";
            }

            const newLog: ApprovalLog = {
              date: Date.now(),
              action: "approve",
              operator,
              comment: newStatus === "approved" ? "审批通过，流程结束" : "节点审批通过，流转至下一环节",
            };

            return {
              instances: {
                ...state.instances,
                [instanceId]: {
                  ...instance,
                  definitionSnapshot: updatedSnapshot, // 保存最新的已处理人数据
                  currentNodeId: nextNodeId,
                  status: newStatus,
                  logs: [...instance.logs, newLog],
                },
              },
            };
          } else {
            // 不满足流转条件：仅更新已处理人列表并记录日志 [cite: 233]
            const newLog: ApprovalLog = {
              date: Date.now(),
              action: "approve",
              operator,
              comment: `已投票通过，等待他人审批 (${updatedProcessedUsers.length}/${approverList?.length || 1})`,
            };

            return {
              instances: {
                ...state.instances,
                [instanceId]: {
                  ...instance,
                  definitionSnapshot: updatedSnapshot,
                  logs: [...instance.logs, newLog],
                },
              },
            };
          }
        });
      },

      reject: (instanceId, operator = "管理员") => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance || instance.status !== "running") return state;

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
                status: "rejected", 
                currentNodeId: null, 
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