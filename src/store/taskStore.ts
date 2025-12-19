import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Task, Role } from "../types/process";
import { useProcessInstanceStore } from "./processInstanceStore";
import { assertTaskAtCurrentNode } from "../utils/guards";

interface TaskState {
  tasks: Task[];

  /** 创建一条待办任务 */
  createTask: (instanceId: string, nodeId: string, assigneeRole: Role) => Task;

  /** （可选）按角色获取待办任务 */
  getTasksByRole: (role: Role) => Task[];

  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string) => void;

  /** 委派审批任务 */
  delegateTask: (
    taskId: string,
    toRole: Role,
    operatorRole: Role
  ) => void;

  cancelTasks: (taskIds: string[], reason?: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      createTask: (instanceId, nodeId, assigneeRole) => {
        const task: Task = {
          id: nanoid(),
          instanceId,
          nodeId,
          assigneeRole,
          status: "pending",
          createdAt: new Date().toISOString(),
        };

        console.log("[TaskStore.createTask]", {
          instanceId,
          nodeId,
          assigneeRole,
        });

        set((state) => ({
          tasks: [...state.tasks, task],
        }));

        return task;
      },

      getTasksByRole: (role) => {
        return get().tasks.filter(
          (t) => t.assigneeRole === role && t.status === "pending"
        );
      },

      delegateTask: (taskId, toRole, operatorRole) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        // 仅允许 pending 的任务被委派
        if (task.status !== "pending") return;

        // 仅允许当前审批人委派
        if (task.assigneeRole !== operatorRole) return;

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  assigneeRole: toRole,
                  delegatedFrom: operatorRole,
                  delegatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      approveTask: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task || task.status !== "pending") return;

        const instanceStore = useProcessInstanceStore.getState();
        const instance = instanceStore.getInstanceById(task.instanceId);
        if (!instance) return;

        // 防抢跑：必须是当前节点
        assertTaskAtCurrentNode({
          taskNodeId: task.nodeId,
          currentNodeId: instance.currentNodeId,
        });

        // 1️⃣ 标记 task 已完成
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: "approved" } : t
          ),
        }));

        // 2️⃣ 通知 instanceStore（由它决定是否推进 / 是否会签完成）
        instanceStore.applyTaskAction({ taskId, action: "approve", operator: task.assigneeRole });
      },

      rejectTask: (taskId) => {
        console.log("[TaskStore.rejectTask]", taskId);

        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        const instanceStore = useProcessInstanceStore.getState();
        const instance = instanceStore.getInstanceById(task.instanceId);
        if (!instance) return;

        // ⭐ 防止抢跑
        assertTaskAtCurrentNode({
          taskNodeId: task.nodeId,
          currentNodeId: instance.currentNodeId,
        });

        // 1️⃣ 更新 task 状态
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId && t.status === "pending"
              ? { ...t, status: "rejected" }
              : t
          ),
        }));

        // 2️⃣ 推进拒绝逻辑（流程终止）
        instanceStore.applyTaskAction({ taskId, action: "reject", operator: task.assigneeRole });
      },

      cancelTasks: (taskIds, reason) => {
        if (!taskIds || taskIds.length === 0) return;

        set((state) => ({
          tasks: state.tasks.map((t) =>
            taskIds.includes(t.id) && t.status === "pending"
              ? {
                  ...t,
                  status: "cancelled",
                  cancelledReason: reason,
                  cancelledAt: Date.now(),
                }
              : t
          ),
        }));
      },
    }),
    {
      name: "enterprise-task-storage",
      storage: createJSONStorage(() => localStorage),
    },
    

    
  )
);
