import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProcessDefinition } from "../types/flow";
import { useAuthStore } from "./useAuthStore";
import type { UserRole } from "./useAuthStore";
import { useTaskStore } from "./taskStore";

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

  /** ⭐ 会签 / 或签运行态记录（关键） */
  approvalRecords: {
    [nodeId: string]: {
      mode: "MATCH_ANY" | "MATCH_ALL";
      assignees: string[];      // 这个节点需要审批的人
      approvedBy: string[];     // 已通过的人
      rejectedBy: string[];     // 已拒绝的人
    };
  };

  /** 设计器快照（锁定审批配置） */
  definitionSnapshot: ProcessDefinition | null;

  /** ⭐ 流程发起人（角色 Key，如 user / admin） */
  createdBy: UserRole;
  createdAt: number;
  formData?: Record<string, unknown>;
  logs: ApprovalLog[];
};

type ProcessInstanceStore = {
  instances: Record<string, ProcessInstance>;
  startProcess: (definition: ProcessDefinition, formData?: Record<string, unknown>) => string;
  getInstanceById: (instanceId: string) => ProcessInstance | undefined;
  moveToNext: (instanceId: string, nextNodeId: string | null) => void;
  approve: (instanceId: string, operator?: string) => void;
  reject: (instanceId: string, operator?: string) => void;
  createInstance: (definitionId: string, startNodeId: string) => ProcessInstance;
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
        const currentUserRole =
          useAuthStore.getState().role ?? "user";

        const startNode = definition.nodes.find((n) => n.type === "start");
        const instanceId = nanoid();
        const now = Date.now();

        // 从 start → 下一个节点
        const firstNode = getNextNode(definition, startNode?.id || null);
        const pendingApprovers = getPendingApproversFromNode(firstNode);

        const approvalRecords: ProcessInstance["approvalRecords"] = {};

        if (firstNode && firstNode.type === "approval") {
          approvalRecords[firstNode.id] = {
            mode: firstNode.config.approvalMode,
            assignees: pendingApprovers,
            approvedBy: [],
            rejectedBy: [],
          };
        }

        const instance: ProcessInstance = {
          instanceId,
          processDefinitionId: definition.id,
          currentNodeId: firstNode ? firstNode.id : null,
          status: "running",

          pendingApprovers,
          approvalRecords,

          createdBy: currentUserRole,
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

      moveToNext: (instanceId, nextNodeId) => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance || instance.status !== "running") return state;

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                currentNodeId: nextNodeId,
                logs: [
                  ...instance.logs,
                  {
                    date: Date.now(),
                    action: "approve",
                    operator: "system",
                    comment: "推进到下一节点",
                  },
                ],
              },
            },
          };
        });
      },

      // =====================
      // 审批通过
      // =====================
      approve: (instanceId, operator = "admin") => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance || instance.status !== "running") return state;

          const { currentNodeId, definitionSnapshot, approvalRecords } = instance;
          if (!currentNodeId) return state;

          const currentNode = definitionSnapshot?.nodes.find(
            (n) => n.id === currentNodeId
          );
          if (!currentNode || currentNode.type !== "approval") return state;

          // ⭐ 取运行态审批记录
          const record = approvalRecords[currentNodeId];
          if (!record) return state;

          // 已审批过，直接忽略
          if (record.approvedBy.includes(operator)) return state;

          // === 写入审批结果 ===
          const updatedRecord = {
            ...record,
            approvedBy: [...record.approvedBy, operator],
          };

          // === 判断是否可以流转 ===
          let shouldMove = false;

          if (updatedRecord.mode === "MATCH_ANY") {
            shouldMove = true;
          }

          if (updatedRecord.mode === "MATCH_ALL") {
            shouldMove =
              updatedRecord.approvedBy.length >= updatedRecord.assignees.length;
          }

          // === 更新 approvalRecords（无论是否流转）===
          const updatedApprovalRecords = {
            ...approvalRecords,
            [currentNodeId]: updatedRecord,
          };

          // ========= 可以流转 =========
          if (shouldMove) {
            const nextNode = getNextNode(definitionSnapshot!, currentNodeId);

            let newStatus: InstanceStatus = "running";
            let nextPendingApprovers: string[] = [];
            const nextApprovalRecords = { ...updatedApprovalRecords };

            if (!nextNode || nextNode.type === "end") {
              newStatus = "approved";
            } else if (nextNode.type === "approval") {
              const taskStore = useTaskStore.getState();

              const exists = taskStore.tasks.some(
                (t) =>
                  t.instanceId === instanceId &&
                  t.nodeId === nextNode.id &&
                  t.status === "pending"
              );

              if (!exists && nextNode.config?.approverRole) {
                taskStore.createTask(
                  instanceId,
                  nextNode.id,
                  nextNode.config.approverRole
                );
              }

              const nextAssignees = getPendingApproversFromNode(nextNode);
              nextPendingApprovers = nextAssignees;

              nextApprovalRecords[nextNode.id] = {
                mode: nextNode.config.approvalMode,
                assignees: nextAssignees,
                approvedBy: [],
                rejectedBy: [],
              };
            }

            return {
              instances: {
                ...state.instances,
                [instanceId]: {
                  ...instance,
                  currentNodeId: nextNode ? nextNode.id : null,
                  status: newStatus,
                  pendingApprovers: nextPendingApprovers,
                  approvalRecords: nextApprovalRecords,
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

          // ========= 未满足会签条件，仅记录进度 =========
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                approvalRecords: updatedApprovalRecords,
                logs: [
                  ...instance.logs,
                  {
                    date: Date.now(),
                    action: "approve",
                    operator,
                    comment: `会签进行中 (${updatedRecord.approvedBy.length}/${updatedRecord.assignees.length})`,
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


      createInstance: (definitionId: string, startNodeId: string) => {
        const instanceId = nanoid();
        const now = Date.now();
        const instance: ProcessInstance = {
          instanceId,
          processDefinitionId: definitionId,
          currentNodeId: startNodeId,
          status: "running",
          pendingApprovers: [],
          approvalRecords: {},
          definitionSnapshot: null,
          createdBy: "user",
          createdAt: now,
          logs: [],
        };
        set((state) => ({
          instances: { ...state.instances, [instanceId]: instance },
        }));
        return instance;
      },
    }),
    {
      name: "enterprise-instance-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
