import { create } from "zustand";
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
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],

  createTask: (instanceId, nodeId, assigneeRole) => {
    const task: Task = {
      id: Date.now().toString(),
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
    console.log("[TaskStore.approveTask]", taskId);

    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const instanceStore = useProcessInstanceStore.getState();
    const instance = instanceStore.getInstanceById(task.instanceId);
    if (!instance) return;

    // ⭐ 防止抢跑：task 必须对应当前节点
    assertTaskAtCurrentNode({
      taskNodeId: task.nodeId,
      currentNodeId: instance.currentNodeId,
    });

    // 1️⃣ 更新 task 状态
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId && t.status === "pending"
          ? { ...t, status: "approved" }
          : t
      ),
    }));

    // ⭐ 防重复推进（必须仍然停留在当前节点）
    if (instance.currentNodeId !== task.nodeId) {
      return;
    }

    // 2️⃣ ⭐ 核心：推进流程（由 instanceStore 负责创建下一 task）
    instanceStore.approve(task.instanceId, task.assigneeRole);
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
    instanceStore.reject(task.instanceId, task.assigneeRole);
  },
}));
