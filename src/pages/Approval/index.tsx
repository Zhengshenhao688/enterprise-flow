import React, { useMemo } from "react";
import {
  Table,
  Tag,
  Typography,
  Card,
  Button,
  message,
  Tooltip,
  Space,
  Tabs,
  Empty,
  Alert,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

import {
  useProcessInstanceStore,
  type ProcessInstance,
} from "../../store/processInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTaskStore } from "../../store/taskStore";
import { ApprovalGuardError } from "../../utils/guards";

const { Title, Text } = Typography;

const Approval: React.FC = () => {
  const navigate = useNavigate();

  // 获取当前用户角色（保持原样，不做额外处理）
  const userRole = useAuthStore((s) => s.role);

  const instancesMap = useProcessInstanceStore((s) => s.instances);
  //const approveInstance = useProcessInstanceStore((s) => s.approve);

  const tasks = useTaskStore((s) => s.tasks);
  const approveTask = useTaskStore((s) => s.approveTask);

  // =========================================================
  // 1) Compute myPendingTasks: tasks assigned to current user role and pending
  // 2) Derive pendingList strictly from myPendingTasks mapping to instances
  // =========================================================
  const myPendingTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.assigneeRole === userRole && t.status === "pending"
      ),
    [tasks, userRole]
  );

  const pendingList = useMemo(
    () =>
      myPendingTasks
        .map((t) => instancesMap[t.instanceId])
        .filter(
          (instance): instance is ProcessInstance => instance !== undefined
        )
        .sort((a, b) => b.createdAt - a.createdAt),
    [myPendingTasks, instancesMap]
  );

  // History list unchanged: all instances not running
  const historyList = useMemo(() => {
    return Object.values(instancesMap)
      .filter((instance) => instance.status !== "running")
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [instancesMap]);

  // --- 表格列定义 ---
  const getColumns = (isHistory = false): ColumnsType<ProcessInstance> => [
    {
      title: "申请内容",
      key: "summary",
      render: (_, record) => (
        <div>
          <Text strong>
            {(record.formData?.title as string) || "未命名申请"}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            单号: {record.instanceId}
          </Text>
        </div>
      ),
    },
    {
      title: "流程类型",
      key: "processName",
      render: (_, record) =>
        record.definitionSnapshot ? (
          <Tag>{record.definitionSnapshot.name}</Tag>
        ) : (
          <Tag>未知流程</Tag>
        ),
    },
    {
      title: "当前节点",
      dataIndex: "currentNodeId",
      key: "currentNodeId",
      render: (text, record) => {
        if (record.status !== "running") return <Text type="secondary">-</Text>;

        if (!record.definitionSnapshot) {
          return <Text type="secondary">流程初始化中</Text>;
        }

        const node = record.definitionSnapshot.nodes.find((n) => n.id === text);
        const role = node?.config?.approverRole;

        return (
          <Space orientation="vertical" size={0}>
            <Tag color="blue">{node?.name || text}</Tag>
            {role && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                (需 {role} 审批)
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const map: Record<string, { color: string; text: string }> = {
          running: { color: "processing", text: "审批中" },
          approved: { color: "success", text: "已通过" },
          rejected: { color: "error", text: "已拒绝" },
        };
        const cur = map[status] || { color: "default", text: status };
        return <Tag color={cur.color}>{cur.text}</Tag>;
      },
    },
    {
      title: "提交时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/approval-detail/${record.instanceId}`)}
          >
            详情
          </Button>

          {!isHistory && record.status === "running" && (
            <Tooltip title="快速通过">
              <Button
                type="text"
                size="small"
                style={{ color: "#52c41a" }}
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  try {
                    const task = tasks.find(
                      (t) =>
                        t.instanceId === record.instanceId &&
                        t.assigneeRole === userRole &&
                        t.status === "pending"
                    );

                    if (!task) {
                      message.error("未找到对应的待办任务，无法快速通过");
                      return;
                    }

                    // 先把当前 task 标记为已审批（内部会做 currentNode 校验）
                    approveTask(task.id);

                    message.success("已通过审批并推进到下一节点");
                  } catch (e) {
                    if (e instanceof ApprovalGuardError) {
                      message.error(e.message);
                      return;
                    }
                    throw e;
                  }
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const getRoleTag = () => {
    switch (userRole) {
      case "admin":
        return <Tag color="red">管理员 (Admin)</Tag>;
      case "manager":
        return <Tag color="orange">部门经理 (Manager)</Tag>;
      case "hr":
        return <Tag color="green">人事专员 (HR)</Tag>;
      case "finance":
        return <Tag color="cyan">财务专员 (Finance)</Tag>;
      default:
        return <Tag color="geekblue">普通员工 ({userRole || "User"})</Tag>;
    }
  };

  // 3) Permission guard: only hr or finance can see pending tab, else show empty alert
  const hasPending = myPendingTasks.length > 0;

  return (
    <div style={{ padding: 24 }}>
      <Card variant="outlined">
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              审批工作台
            </Title>
            <Text type="secondary">当前登录身份: {getRoleTag()}</Text>
          </div>
        </div>

        {hasPending ? (
          <Tabs
            defaultActiveKey="pending"
            items={[
              {
                key: "pending",
                label: (
                  <span>
                    <ClockCircleOutlined />
                    待我审批 ({pendingList.length})
                  </span>
                ),
                children: (
                  <Table
                    dataSource={pendingList}
                    columns={getColumns(false)}
                    rowKey="instanceId"
                    pagination={{ pageSize: 5 }}
                    // ⭐ 提示：如果列表为空，增加明确的反馈引导
                    locale={{
                      emptyText: (
                        <Empty
                          description={
                            <span>
                              暂无待办任务 <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                提示：审批单仅在流程流转到【{userRole}
                                】节点时才会显示。请检查流程配置的角色 ID 是否为
                                "{userRole}"。
                              </Text>
                            </span>
                          }
                        />
                      ),
                    }}
                  />
                ),
              },
              {
                key: "history",
                label: (
                  <span>
                    <HistoryOutlined />
                    审批历史
                  </span>
                ),
                children: (
                  <Table
                    dataSource={historyList}
                    columns={getColumns(true)}
                    rowKey="instanceId"
                    pagination={{ pageSize: 10 }}
                  />
                ),
              },
            ]}
          />
        ) : (
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Alert message="当前无审批权限 / 无待办任务" type="info" showIcon />
          </div>
        )}
      </Card>
    </div>
  );
};

export default Approval;
