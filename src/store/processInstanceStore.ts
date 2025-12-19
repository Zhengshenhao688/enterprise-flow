import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProcessDefinition } from "../types/flow";
import type { Role } from "../types/process";
import { useAuthStore } from "./useAuthStore";
import type { UserRole } from "./useAuthStore";
import { useTaskStore } from "./taskStore";

// =====================
// 审批日志
// =====================
export type ApprovalLog = {
  date: number;
  action: "submit" | "approve" | "reject" | "delegate";
  operator: string;
  comment?: string;
};

export type InstanceStatus = "running" | "approved" | "rejected";

// =====================
// 流程实例（运行态数据）
// =====================
export type ProcessInstance = {
  instanceId: string;
  title: string;
  processDefinitionId: string;
  currentNodeId: string | null;
  status: InstanceStatus;

  /** ⭐ task 级会签记录（方案二核心） */
  approvalRecords: {
    [nodeId: string]: {
      mode: "MATCH_ANY" | "MATCH_ALL";
      taskIds: string[];
      approvedTaskIds: string[];
      rejectedTaskIds: string[];
    };
  };

  definitionSnapshot: ProcessDefinition | null;
  createdBy: UserRole;
  createdAt: number;
  formData?: Record<string, unknown>;
  logs: ApprovalLog[];
};

// =====================
// Store 类型
// =====================
type ProcessInstanceStore = {
  instances: Record<string, ProcessInstance>;

  startProcess: (
    definition: ProcessDefinition,
    formData?: Record<string, unknown>
  ) => string;

  getInstanceById: (instanceId: string) => ProcessInstance | undefined;

  /** ⭐ Step 3 新接口：task 驱动流程（占位版） */
  applyTaskAction: (params: {
    taskId: string;
    action: "approve" | "reject";
    operator: string;
  }) => void;

  createInstance: (
    definitionId: string,
    startNodeId: string
  ) => ProcessInstance;

  appendLog: (instanceId: string, log: ApprovalLog) => void;
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

// =====================
// Store 实现
// =====================
export const useProcessInstanceStore = create<ProcessInstanceStore>()(
  persist(
    (set, get) => ({
      instances: {},

      // =====================
      // 发起流程
      // =====================
      startProcess: (definition, formData = {}) => {
        const title =
          typeof formData.title === "string" && formData.title.trim()
            ? formData.title
            : definition.name;

        const currentUserRole = useAuthStore.getState().role ?? "user";
        const startNode = definition.nodes.find((n) => n.type === "start");
        const instanceId = nanoid();
        const now = Date.now();

        const firstNode = getNextNode(definition, startNode?.id || null);

        const approvalRecords: ProcessInstance["approvalRecords"] = {};

        if (firstNode && firstNode.type === "approval") {
          const taskStore = useTaskStore.getState();

          const tasks = firstNode.config.approverRoles?.map((role) =>
            taskStore.createTask(instanceId, firstNode.id, role as Role)
          ) || (firstNode.config.approverRole ? [taskStore.createTask(instanceId, firstNode.id, firstNode.config.approverRole as Role)] : []);

          approvalRecords[firstNode.id] = {
            mode: firstNode.config.approvalMode,
            taskIds: tasks.map((t) => t.id),
            approvedTaskIds: [],
            rejectedTaskIds: [],
          };
        }

        const instance: ProcessInstance = {
          instanceId,
          title,
          processDefinitionId: definition.id,
          currentNodeId: firstNode ? firstNode.id : null,
          status: "running",
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

      // =====================
      // Step 3：task 驱动（占位版）
      // =====================
      applyTaskAction: ({ taskId, action, operator }) => {
        set((state) => {
          const taskStore = useTaskStore.getState();

          // 1️⃣ 找到 task
          const task = taskStore.tasks.find((t) => t.id === taskId);
          if (!task) return state;

          const instance = state.instances[task.instanceId];
          if (!instance || instance.status !== "running") return state;

          const nodeId = task.nodeId;
          const record = instance.approvalRecords[nodeId];
          if (!record) return state;

          // 2️⃣ 写入 task 级审批结果
          const approvedTaskIds = [...record.approvedTaskIds];
          const rejectedTaskIds = [...record.rejectedTaskIds];

          if (action === "approve") {
            if (!approvedTaskIds.includes(taskId)) {
              approvedTaskIds.push(taskId);
            }
          }

          if (action === "reject") {
            if (!rejectedTaskIds.includes(taskId)) {
              rejectedTaskIds.push(taskId);
            }
          }

          const updatedRecord = {
            ...record,
            approvedTaskIds,
            rejectedTaskIds,
          };

          // 3️⃣ 判断是否满足会签推进条件
          let shouldMove = false;
          let shouldReject = false;

          if (record.mode === "MATCH_ANY") {
            if (approvedTaskIds.length >= 1) {
              shouldMove = true;
            }
          }

          if (record.mode === "MATCH_ALL") {
            if (rejectedTaskIds.length > 0) {
              shouldReject = true;
            } else if (approvedTaskIds.length === record.taskIds.length) {
              shouldMove = true;
            }
          }

          // 4️⃣ 更新 approvalRecords
          const nextApprovalRecords = {
            ...instance.approvalRecords,
            [nodeId]: updatedRecord,
          };

          // 5️⃣ 会签失败 → 整个流程 reject
          if (shouldReject) {
            // 关闭其余 task
            const remainTaskIds = record.taskIds.filter(
              (id) => id !== taskId
            );
            taskStore.cancelTasks(remainTaskIds, "会签失败，流程终止");

            return {
              instances: {
                ...state.instances,
                [instance.instanceId]: {
                  ...instance,
                  status: "rejected",
                  currentNodeId: null,
                  approvalRecords: nextApprovalRecords,
                  logs: [
                    ...instance.logs,
                    {
                      date: Date.now(),
                      action: "reject",
                      operator,
                      comment: "会签节点被拒绝，流程终止",
                    },
                  ],
                },
              },
            };
          }

          // 6️⃣ 会签通过 → 推进到下一个节点
          if (shouldMove) {
            // 关闭其余未处理 task
            const remainTaskIds = record.taskIds.filter(
              (id) => !approvedTaskIds.includes(id)
            );
            taskStore.cancelTasks(remainTaskIds, "会签已完成，任务自动关闭");

            const nextNode = instance.definitionSnapshot
              ? (() => {
                  const edge = instance.definitionSnapshot.edges.find(
                    (e) => e.from.nodeId === nodeId
                  );
                  return edge
                    ? instance.definitionSnapshot.nodes.find(
                        (n) => n.id === edge.to.nodeId
                      ) || null
                    : null;
                })()
              : null;

            let newStatus: InstanceStatus = "running";
            let nextNodeId: string | null = null;

            const finalApprovalRecords = { ...nextApprovalRecords };

            if (!nextNode || nextNode.type === "end") {
              newStatus = "approved";
            } else if (nextNode.type === "approval") {
              const nextRoles =
                Array.isArray(nextNode.config.approverRoles)
                  ? nextNode.config.approverRoles
                  : nextNode.config.approverRole
                  ? [nextNode.config.approverRole]
                  : [];

              const tasks = nextRoles.map((role) =>
                taskStore.createTask(
                  instance.instanceId,
                  nextNode.id,
                  role as Role
                )
              );

              nextNodeId = nextNode.id;

              finalApprovalRecords[nextNode.id] = {
                mode: nextNode.config.approvalMode,
                taskIds: tasks.map((t) => t.id),
                approvedTaskIds: [],
                rejectedTaskIds: [],
              };
            }

            return {
              instances: {
                ...state.instances,
                [instance.instanceId]: {
                  ...instance,
                  status: newStatus,
                  currentNodeId: nextNodeId,
                  approvalRecords: finalApprovalRecords,
                  logs: [
                    ...instance.logs,
                    {
                      date: Date.now(),
                      action: "approve",
                      operator,
                      comment:
                        newStatus === "approved"
                          ? "会签完成，流程结束"
                          : "会签完成，流转到下一节点",
                    },
                  ],
                },
              },
            };
          }

          // 7️⃣ 未达成条件，仅记录进度
          return {
            instances: {
              ...state.instances,
              [instance.instanceId]: {
                ...instance,
                approvalRecords: nextApprovalRecords,
                logs: [
                  ...instance.logs,
                  {
                    date: Date.now(),
                    action,
                    operator,
                    comment: `会签进行中 (${approvedTaskIds.length}/${record.taskIds.length})`,
                  },
                ],
              },
            },
          };
        });
      },

      appendLog: (instanceId, log) => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance) return state;

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                logs: [...instance.logs, log],
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
          title: "未命名流程",
          processDefinitionId: definitionId,
          currentNodeId: startNodeId,
          status: "running",
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