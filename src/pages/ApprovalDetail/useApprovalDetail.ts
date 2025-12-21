import { message } from "antd";
import { useProcessInstanceStore } from "../../store/processInstanceStore";
import { useTaskStore } from "../../store/taskStore";
import { useAuthStore } from "../../store/useAuthStore";
import { ApprovalGuardError } from "../../utils/guards";
import type { Role } from "../../types/process";
import { buildApprovalPath } from "../../engine/approvalPath";
import type { EngineFlowDefinition } from "../../engine/types";
import type { ApprovalPathNode } from "../../engine/types";

/* =========================
 * 主 Hook（纯逻辑）
 * ========================= */

export function useApprovalDetail(instanceId?: string) {
  const instance = useProcessInstanceStore((s) =>
    instanceId ? s.instances[instanceId] : undefined
  );

  const tasks = useTaskStore((s) => s.tasks);
  const approveTask = useTaskStore((s) => s.approveTask);
  const rejectTask = useTaskStore((s) => s.rejectTask);

  const currentUserRole = useAuthStore((s) => s.role as Role);

  if (!instance || !instance.definitionSnapshot) {
    return {
      instance,
      approvalPath: [],
      stepsMeta: [],
      currentStep: 0,
      canApprove: false,
      isCreator: false,
      myPendingTask: undefined,
      handlers: {
        approve: () => {},
        reject: () => {},
      },
    };
  }

  const engineDef: EngineFlowDefinition = {
    nodes: instance.definitionSnapshot.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.name,
      config: n.config,
    })),
    edges: instance.definitionSnapshot.edges,
  };
  const approvalPath: ApprovalPathNode[] = buildApprovalPath(engineDef, {
    form: instance.formData || {},
  });

  const myPendingTask = tasks.find(
    (t) =>
      t.instanceId === instance.instanceId &&
      t.assigneeRole === currentUserRole &&
      t.status === "pending"
  );

  const isCreator = instance.createdBy === currentUserRole;

  let currentApprovalIndex = approvalPath.findIndex(
    (n) => n.id === instance.currentNodeId
  );

  if (currentApprovalIndex === -1 && instance.status === "running") {
    currentApprovalIndex = approvalPath.findIndex(
      (n) => !instance.approvalRecords?.[n.id]
    );
    if (currentApprovalIndex === -1) {
      currentApprovalIndex = approvalPath.length;
    }
  }

  const getStepStatus = (index: number): "wait" | "process" | "finish" | "error" => {
    if (instance.status === "approved") return "finish";
    if (instance.status === "rejected") {
      if (index < currentApprovalIndex) return "finish";
      if (index === currentApprovalIndex) return "error";
      return "wait";
    }
    if (index < currentApprovalIndex) return "finish";
    if (index === currentApprovalIndex) return "process";
    return "wait";
  };

  const getRuntimeApproversText = (nodeId: string): string => {
    const record = instance.approvalRecords?.[nodeId];
    if (!record) return "未开始";
    const nodeTasks = tasks.filter((t) =>
      record.taskIds?.includes(t.id)
    );
    const roles = Array.from(new Set(nodeTasks.map((t) => t.assigneeRole)));
    return roles.length ? roles.join(" / ") : "未配置";
  };

  const stepsMeta = [
    {
      title: "发起申请",
      status: "finish",
    },
    ...approvalPath.map((node: ApprovalPathNode, index: number) => ({
      nodeId: node.id,
      title: node.label,
      approversText: getRuntimeApproversText(node.id),
      status: getStepStatus(index),
    })),
    {
      title: "流程结束",
      status:
        instance.status === "approved"
          ? "finish"
          : instance.status === "rejected"
          ? "error"
          : "wait",
    },
  ];

  const currentStep = Math.max(
    0,
    stepsMeta.findIndex((s) => s.status === "process")
  );

  const canApprove =
    instance.status === "running" && !isCreator && !!myPendingTask;

  const handlers = {
    approve() {
      if (!myPendingTask) return;
      try {
        approveTask(myPendingTask.id);
      } catch (e) {
        if (e instanceof ApprovalGuardError) {
          message.error(e.message);
          return;
        }
        throw e;
      }
    },
    reject() {
      if (!myPendingTask) return;
      try {
        rejectTask(myPendingTask.id);
      } catch (e) {
        if (e instanceof ApprovalGuardError) {
          message.error(e.message);
          return;
        }
        throw e;
      }
    },
  };

  return {
    instance,
    approvalPath,
    stepsMeta,
    currentStep,
    canApprove,
    myPendingTask,
    isCreator,
    handlers,
  };
}