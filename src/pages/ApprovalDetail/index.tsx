import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, Typography, Button, Descriptions, Tag, Timeline, 
  Space, Steps, Alert, message 
} from "antd";
import type { StepsProps } from "antd";
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  UserOutlined,
  SwapOutlined
} from "@ant-design/icons";

import { useProcessInstanceStore } from "../../store/processInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";
import { ApprovalGuardError } from "../../utils/guards";
import { useTaskStore } from "../../store/taskStore";
import type { Role } from "../../types/process";

const { Title, Text } = Typography;

const ApprovalDetailPage: React.FC = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  
  // 1. 获取当前用户角色 (用于权限判定)
  const currentUserRole = useAuthStore((s) => s.role as Role);
  
  // 2. 获取实例数据
  const instance = useProcessInstanceStore((s) => 
    instanceId ? s.instances[instanceId] : undefined
  );

  console.log("[ApprovalDetail] instance", {
    instanceId: instance?.instanceId,
    status: instance?.status,
    currentNodeId: instance?.currentNodeId,
    formData: instance?.formData,
  });
  
  const approveTask = useTaskStore((s) => s.approveTask);
  const rejectTask = useTaskStore((s) => s.rejectTask);

  // ⭐ task 驱动：读取当前用户在该实例下的待办 task
  const tasks = useTaskStore((s) => s.tasks);

  if (!instance) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Title level={4}>未找到审批单</Title>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  if (!instance.definitionSnapshot) {
    return (
      <Alert
        style={{ margin: 40 }}
        message="审批单正在初始化中，请稍后刷新页面。"
        type="info"
        showIcon
      />
    );
  }

  const formData = instance.formData || {};

  const myPendingTask = tasks.find(
    (t) =>
      t.instanceId === instance.instanceId &&
      t.assigneeRole === currentUserRole &&
      t.status === "pending"
  );

  console.log("[ApprovalDetail] myPendingTask", myPendingTask);
  console.log("[ApprovalDetail] allTasksForInstance", tasks.filter(t => t.instanceId === instance.instanceId));

  // =========================================================
  // ✅ Steps：适配任何流程的最小正确实现（definition 顺序 + runtime 状态覆盖）
  //    - 顺序：来自 definitionSnapshot（按运行条件解析 gateway 得到“实际路径”）
  //    - 状态：来自 approvalRecords + currentNodeId + instance.status
  // =========================================================

  type FormContext = { form: Record<string, unknown> };
  type ConditionOp = "gt" | "gte" | "lt" | "lte" | "eq" | "neq";

  interface GatewayCondition {
    left?: string;
    op?: ConditionOp;
    right?: unknown;
  }

  const getByPath = (obj: unknown, path: string): unknown => {
    if (!path) return undefined;
    const parts = path.split(".").filter(Boolean);
    let cur: unknown = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  };

  const toComparable = (v: unknown): string | number | boolean | null => {
    if (v == null) return null;
    if (typeof v === "number" || typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim();
      if (s !== "" && !Number.isNaN(Number(s))) return Number(s);
      if (s === "true") return true;
      if (s === "false") return false;
      return s;
    }
    return String(v);
  };

  const evalCondition = (
    condition: GatewayCondition | undefined,
    context: FormContext
  ): boolean => {
    if (!condition || !condition.left || !condition.op) return false;

    const leftPath = condition.left;
    const rightRaw = condition.right;

    const leftValueRaw =
      leftPath.startsWith("form.") ? getByPath(context, leftPath) : undefined;

    const leftValue = toComparable(leftValueRaw);
    const rightValue = toComparable(rightRaw);

    const bothNumber =
      typeof leftValue === "number" && typeof rightValue === "number";

    const l = bothNumber ? leftValue : String(leftValue ?? "");
    const r = bothNumber ? rightValue : String(rightValue ?? "");

    switch (condition.op) {
      case "gt":
        return l > r;
      case "gte":
        return l >= r;
      case "lt":
        return l < r;
      case "lte":
        return l <= r;
      case "eq":
        return l === r;
      case "neq":
        return l !== r;
      default:
        return false;
    }
  };

  const resolveNextNodeId = (
    def: NonNullable<typeof instance.definitionSnapshot>,
    currentNodeId: string,
    context: FormContext
  ): string | null => {
    const outgoing = def.edges.filter((e) => e.from.nodeId === currentNodeId);
    if (outgoing.length === 0) return null;

    const currentNode = def.nodes.find((n) => n.id === currentNodeId);
    const isGateway = currentNode?.type === "gateway";

    // 非 gateway：默认只走第一条（你的流程引擎也是单出口推进）
    if (!isGateway) {
      return outgoing[0]?.to?.nodeId ?? null;
    }

    // gateway：先找条件命中，再走 default
    for (const e of outgoing) {
      if (!e.isDefault && e.condition) {
        if (evalCondition(e.condition as GatewayCondition, context)) {
          return e.to?.nodeId ?? null;
        }
      }
    }

    const defEdge = outgoing.find((e) => e.isDefault);
    return defEdge?.to?.nodeId ?? null;
  };

  const buildApprovalPath = (
    def: NonNullable<typeof instance.definitionSnapshot>,
    context: FormContext
  ): Array<{ id: string; name: string; config?: unknown }> => {
    const startNode = def.nodes.find((n) => n.type === "start");
    if (!startNode) return [];

    const visited = new Set<string>();
    const approvals: Array<{ id: string; name: string; config?: unknown }> = [];

    let cursorId: string | null = startNode.id;
    let guard = 0;

    while (cursorId && guard < 200) {
      guard += 1;
      if (visited.has(cursorId)) break;
      visited.add(cursorId);

      const node = def.nodes.find((n) => n.id === cursorId);
      if (!node) break;

      if (node.type === "approval") {
        approvals.push({ id: node.id, name: node.name, config: (node as { config?: unknown }).config });
      }

      if (node.type === "end") break;

      const nextId = resolveNextNodeId(def, cursorId, context);
      if (!nextId) break;
      cursorId = nextId;
    }

    return approvals;
  };

  const context = { form: formData as Record<string, unknown> };
  const approvalPath = buildApprovalPath(instance.definitionSnapshot, context);

  // 当前运行中的审批节点 index（如果 currentNode 不是 approval，则回退到第一个未进入的审批节点）
  let currentApprovalIndex = approvalPath.findIndex((n) => n.id === instance.currentNodeId);
  if (currentApprovalIndex === -1 && instance.status === "running") {
    currentApprovalIndex = approvalPath.findIndex((n) => !instance.approvalRecords?.[n.id]);
    if (currentApprovalIndex === -1) currentApprovalIndex = approvalPath.length;
  }

  const getApprovalStepStatus = (index: number): "wait" | "process" | "finish" | "error" => {
    if (instance.status === "approved") return "finish";
    if (instance.status === "rejected") {
      if (index < currentApprovalIndex) return "finish";
      if (index === currentApprovalIndex) return "error";
      return "wait";
    }

    // running
    if (index < currentApprovalIndex) return "finish";
    if (index === currentApprovalIndex) return "process";
    return "wait";
  };



  // 新增：运行态审批人解析函数
  const getRuntimeApproversText = (nodeId: string): string => {
    const record = instance.approvalRecords?.[nodeId];
    if (!record) return "未开始";

    const nodeTasks = tasks.filter(t => record.taskIds?.includes(t.id));
    const roles = Array.from(new Set(nodeTasks.map(t => t.assigneeRole)));

    if (roles.length === 0) return "未配置";
    return roles.join(" / ");
  };

  const stepItems: StepsProps["items"] = [
    {
      title: "发起申请",
      status: "finish",
      icon: <UserOutlined />,
    },
    ...approvalPath.map((node, index) => {
      const record = instance.approvalRecords?.[node.id];

      const status: "wait" | "process" | "finish" | "error" = getApprovalStepStatus(index);

      // content（antd 新版推荐，避免 items.description deprecated 警告）
      let content: React.ReactNode = "等待审批";

      if (record) {
        const approvedCount = record.approvedTaskIds?.length ?? 0;
        const totalCount = record.taskIds?.length ?? 0;

        if (record.mode === "MATCH_ALL") {
          content = `会签进行中 (${approvedCount}/${totalCount})`;
        } else {
          // MATCH_ANY
          content = approvedCount > 0 ? "或签：已有人通过" : `或签进行中 (0/${totalCount})`;
        }
      }

      return {
        title: (
          <div style={{ textAlign: "center" }}>
            <div>{node.name}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              审批人：{getRuntimeApproversText(node.id)}
            </div>
          </div>
        ),
        status,
        content,
      };
    }),
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
    stepItems.findIndex((i) => i?.status === "process")
  );

  console.log("[ApprovalDetail][Steps]", {
    approvalPath: approvalPath.map((n) => n.name),
    currentApprovalIndex,
    currentStep,
    instanceCurrentNodeId: instance.currentNodeId,
    instanceStatus: instance.status,
  });

  // =========================================================
  // ⭐ 核心修复：完善权限判定逻辑 
  // =========================================================
  
  // 是否发起人
  const isCreator = instance.createdBy === currentUserRole;

  console.log("[ApprovalDetail] roleCheck", {
    currentUserRole,
    isCreator,
    instanceStatus: instance.status,
  });
  
  const canApprove =
    instance.status === "running" &&
    !isCreator &&
    !!myPendingTask;

  return (
    <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100vh" }}>
      <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回审批列表</Button>
      
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {/* 顶部状态卡片 */}
        <Card variant="outlined">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: '0 0 8px 0' }}>{(formData.title as string) || '无标题申请'}</Title>
              <Space>
                <Tag color={instance.status === 'running' ? 'blue' : (instance.status === 'approved' ? 'green' : 'red')}>
                  {instance.status === 'running' ? '审批中' : (instance.status === 'approved' ? '已通过' : '已驳回')}
                </Tag>
                <Text type="secondary">申请单号: {instance.instanceId}</Text>
              </Space>
            </div>
            
            {/* 权限受控的操作按钮组 */}
            {canApprove && (
              <Space size="middle">
                 <Button 
                   danger 
                   size="large" 
                   icon={<CloseCircleOutlined />} 
                   onClick={() => {
                     try {
                       if (!myPendingTask) {
                         message.error("未找到你的待办任务，无法执行审批操作");
                         return;
                       }
                       rejectTask(myPendingTask.id);
                     } catch (e) {
                       if (e instanceof ApprovalGuardError) {
                         message.error(e.message);
                         return;
                       }
                       throw e;
                     }
                   }}
                 >
                   拒绝
                 </Button>
                 <Button 
                   type="primary" 
                   size="large" 
                   icon={<CheckCircleOutlined />} 
                   onClick={() => {
                     try {
                       if (!myPendingTask) {
                         message.error("未找到你的待办任务，无法执行审批操作");
                         return;
                       }
                       approveTask(myPendingTask.id);
                     } catch (e) {
                       if (e instanceof ApprovalGuardError) {
                         message.error(e.message);
                         return;
                       }
                       throw e;
                     }
                   }}
                 >
                   通过审批
                 </Button>
              </Space>
            )}

            {isCreator && instance.status === "running" && (
              <Alert
                type="info"
                showIcon
                message="你是该流程的发起人，可查看流程进度，但不能参与审批。"
                style={{ marginTop: 16 }}
              />
            )}
          </div>
          
          {/* 如果有权限但还在等待他人会签，可以增加提示 */}
          {canApprove && instance.approvalRecords?.[instance.currentNodeId || ""]?.mode === 'MATCH_ALL' && (
            <Alert 
              message="当前为会签模式，需要所有指定人员通过后流程才会流转。" 
              type="info" 
              showIcon 
              style={{ marginTop: 16 }} 
            />
          )}
        </Card>

        {/* 流程进度 Steps */}
        <Card title="流程进度" variant="outlined">
          <Steps current={currentStep} items={stepItems} titlePlacement="vertical" />
        </Card>

        <div style={{ display: "flex", gap: 24 }}>
          {/* 左侧：表单详情 */}
          <Card title="申请单详情" variant="outlined" style={{ flex: 1 }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="申请标题">
                <Text strong>{(formData.title as string) || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="申请理由">
                {(formData.reason as string) || '无'}
              </Descriptions.Item>
              {/* 动态渲染其他表单项 */}
              {Object.entries(formData).map(([key, value]) => {
                if (key === 'title' || key === 'reason') return null;
                return (
                  <Descriptions.Item label={key} key={key}>
                    {String(value)}
                  </Descriptions.Item>
                );
              })}
              <Descriptions.Item label="提交时间">
                {new Date(instance.createdAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 右侧：审批日志 */}
          <Card title="审批流转动态" variant="outlined" style={{ width: 400, flexShrink: 0 }}>
            <Timeline
              items={instance.logs.map((log) => {
                let color: string = "blue";
                let icon: React.ReactNode = <UserOutlined />;
                let actionText = "";

                switch (log.action) {
                  case "submit":
                    color = "blue";
                    icon = <UserOutlined />;
                    actionText = "提交申请";
                    break;
                  case "approve":
                    color = "green";
                    icon = <CheckCircleOutlined />;
                    actionText = "通过审批";
                    break;
                  case "reject":
                    color = "red";
                    icon = <CloseCircleOutlined />;
                    actionText = "驳回审批";
                    break;
                  case "delegate":
                    color = "orange";
                    icon = <SwapOutlined />;
                    actionText = "委派审批";
                    break;
                  default:
                    actionText = log.action;
                }

                return {
                  color,
                  dot: icon,
                  content: (
                    <div key={log.date}>
                      <Space>
                        <Text strong>{log.operator}</Text>
                        <Text>{actionText}</Text>
                      </Space>

                      {log.comment && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {log.comment}
                          </Text>
                        </div>
                      )}

                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(log.date).toLocaleString()}
                        </Text>
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </Card>
        </div>
      </Space>
    </div>
  );
};

export default ApprovalDetailPage;