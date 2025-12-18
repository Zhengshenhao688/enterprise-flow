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

const { Title, Text } = Typography;

const Approval: React.FC = () => {
  const navigate = useNavigate();

  // 获取当前用户角色并标准化
  const userRole = useAuthStore((s) => s.role);
  const currentUserKey = userRole?.trim().toLowerCase() || "";

  const instancesMap = useProcessInstanceStore((s) => s.instances);
  const approve = useProcessInstanceStore((s) => s.approve);

  // =========================================================
  // ⭐ 核心修复：细化数据过滤逻辑 (Step 3)
  // =========================================================
  const { pendingList, historyList } = useMemo(() => {
    const all = Object.values(instancesMap).sort(
      (a, b) => b.createdAt - a.createdAt
    );

    const pending: ProcessInstance[] = [];
    const history: ProcessInstance[] = [];

    all.forEach((instance) => {
      // 1️⃣ 历史
      if (instance.status !== "running") {
        history.push(instance);
        return;
      }

      const pendingRoles = Array.isArray(instance.pendingApprovers)
        ? instance.pendingApprovers.map((r) => r.toLowerCase())
        : [];

      const isAdmin = currentUserKey === "admin";

      // 2️⃣ 待办（唯一正确来源）
      if (isAdmin || pendingRoles.includes(currentUserKey)) {
        pending.push(instance);
      }
    });

    return { pendingList: pending, historyList: history };
  }, [instancesMap, currentUserKey]);

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
      render: (_, record) => <Tag>{record.definitionSnapshot.name}</Tag>,
    },
    {
      title: "当前节点",
      dataIndex: "currentNodeId",
      key: "currentNodeId",
      render: (text, record) => {
        if (record.status !== "running") return <Text type="secondary">-</Text>;

        const node = record.definitionSnapshot.nodes.find((n) => n.id === text);
        const role = node?.config?.approverRole;

        return (
          <Space direction="vertical" size={0}>
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
            onClick={() => navigate(`/approval/${record.instanceId}`)}
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
                  approve(record.instanceId, userRole || "未知用户");
                  message.success("已执行快速通过逻辑");
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const getRoleTag = () => {
    switch (currentUserKey) {
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

  return (
    <div style={{ padding: 24 }}>
      <Card bordered={false}>
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
                              】节点时才会显示。请检查流程配置的角色 ID 是否为 "
                              {currentUserKey}"。
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
      </Card>
    </div>
  );
};

export default Approval;
