import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProcessDefinition } from "../types/flow";

// =====================
// 审批日志
// =====================
export type ApprovalLog = {
  date: number;
  action: "submit" | "approve" | "reject";
  operator: string;
  comment?: string;
};

export type InstanceStatus = "running" | "approved" | "rejected";

// =====================
// 流程实例
// =====================
export type ProcessInstance = {
  instanceId: string;
  processDefinitionId: string;
  currentNodeId: string | null;
  status: InstanceStatus;

  /** ⭐ 当前节点待审批角色（运行时核心） */
  pendingApprovers: string[];

  /** 设计器快照（锁定审批配置） */
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

// =====================
// 工具函数
// =====================
function getNextNode(def: ProcessDefinition, nodeId: string | null) {
  if (!nodeId) return null;
  const edge = def.edges.find((e) => e.from.nodeId === nodeId);
  if (!edge) return null;
  return def.nodes.find((n) => n.id === edge.to.nodeId) || null;
}

function getPendingApproversFromNode(
  node: ProcessDefinition["nodes"][number] | null
): string[] {
  if (!node || node.type !== "approval") return [];

  if (node.config.approvalMode === "MATCH_ALL") {
    return node.config.approverList || [];
  }

  return node.config.approverRole ? [node.config.approverRole] : [];
}

// =====================
// Store
// =====================
export const useProcessInstanceStore = create<ProcessInstanceStore>()(
  persist(
    (set, get) => ({
      instances: {},

      // =====================
      // 发起流程
      // =====================
      startProcess: (definition, formData = {}) => {
        const startNode = definition.nodes.find((n) => n.type === "start");
        const instanceId = nanoid();
        const now = Date.now();

        // 从 start → 下一个节点
        const firstNode = getNextNode(definition, startNode?.id || null);

        const pendingApprovers = getPendingApproversFromNode(firstNode);

        const instance: ProcessInstance = {
          instanceId,
          processDefinitionId: definition.id,
          currentNodeId: firstNode ? firstNode.id : null,
          status: "running",
          pendingApprovers,
          definitionSnapshot: definition,
          createdAt: now,
          formData,
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
          instances: { ...state.instances, [instanceId]: instance },
        }));

        return instanceId;
      },

      getInstanceById: (instanceId) => get().instances[instanceId],

      // =====================
      // 审批通过
      // =====================
      approve: (instanceId, operator = "admin") => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance || instance.status !== "running") return state;

          const { currentNodeId, definitionSnapshot } = instance;
          const currentNode = definitionSnapshot.nodes.find((n) => n.id === currentNodeId);
          if (!currentNode) return state;

          // 非审批节点不处理
          if (currentNode.type !== "approval") return state;

          const { approvalMode, approverList } = currentNode.config;
          const processedUsers = currentNode.config.processedUsers || [];

          if (processedUsers.includes(operator)) return state;

          const updatedProcessedUsers = [...processedUsers, operator];

          // 更新 snapshot 中的 processedUsers
          const updatedNodes = definitionSnapshot.nodes.map((n) =>
            n.id === currentNodeId
              ? { ...n, config: { ...n.config, processedUsers: updatedProcessedUsers } }
              : n
          );

          const updatedSnapshot: ProcessDefinition = {
            ...definitionSnapshot,
            nodes: updatedNodes,
          };

          let shouldMove = false;

          if (approvalMode === "MATCH_ANY") {
            shouldMove = true;
          } else if (approvalMode === "MATCH_ALL") {
            shouldMove = updatedProcessedUsers.length >= (approverList?.length || 1);
          }

          // ========= 流转 =========
          if (shouldMove) {
            const nextNode = getNextNode(updatedSnapshot, currentNodeId);

            let newStatus: InstanceStatus = "running";
            let nextPendingApprovers: string[] = [];

            if (!nextNode || nextNode.type === "end") {
              newStatus = "approved";
            } else {
              nextPendingApprovers = getPendingApproversFromNode(nextNode);
            }

            return {
              instances: {
                ...state.instances,
                [instanceId]: {
                  ...instance,
                  currentNodeId: nextNode ? nextNode.id : null,
                  status: newStatus,
                  pendingApprovers: nextPendingApprovers,
                  definitionSnapshot: updatedSnapshot,
                  logs: [
                    ...instance.logs,
                    {
                      date: Date.now(),
                      action: "approve",
                      operator,
                      comment:
                        newStatus === "approved"
                          ? "审批完成，流程结束"
                          : "审批通过，流转至下一节点",
                    },
                  ],
                },
              },
            };
          }

          // ========= 未流转，仅记录会签进度 =========
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                definitionSnapshot: updatedSnapshot,
                pendingApprovers: approverList || [],
                logs: [
                  ...instance.logs,
                  {
                    date: Date.now(),
                    action: "approve",
                    operator,
                    comment: `已审批 (${updatedProcessedUsers.length}/${approverList?.length || 1})`,
                  },
                ],
              },
            },
          };
        });
      },

      // =====================
      // 审批拒绝
      // =====================
      reject: (instanceId, operator = "admin") => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance || instance.status !== "running") return state;

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                status: "rejected",
                currentNodeId: null,
                pendingApprovers: [],
                logs: [
                  ...instance.logs,
                  {
                    date: Date.now(),
                    action: "reject",
                    operator,
                    comment: "审批拒绝，流程终止",
                  },
                ],
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