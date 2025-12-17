import React, { useMemo } from "react";
import { Table, Tag, Typography, Card, Button, message, Tooltip, Space, Tabs, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  HistoryOutlined, 
} from "@ant-design/icons";

import { useProcessInstanceStore, type ProcessInstance } from "../../store/processInstanceStore";
import { useAuthStore } from "../../store/useAuthStore"; 

const { Title, Text } = Typography;

const Approval: React.FC = () => {
  const navigate = useNavigate();
  
  // 获取当前用户角色
  const userRole = useAuthStore((s) => s.role);
  // ⭐ 1. 提取当前用户 Key (转小写)
  const currentUserKey = userRole?.trim().toLowerCase() || "";

  const instancesMap = useProcessInstanceStore((s) => s.instances);
  const approve = useProcessInstanceStore((s) => s.approve);

  // 核心：数据过滤与分组
  const { pendingList, historyList } = useMemo(() => {
    const all = Object.values(instancesMap).sort((a, b) => b.createdAt - a.createdAt);
    
    const pending: ProcessInstance[] = [];
    const history: ProcessInstance[] = [];

    all.forEach((instance) => {
      // A. 历史任务
      if (instance.status !== "running") {
        history.push(instance);
        return;
      }

      // B. 待办任务 - 权限过滤
      
      // 1. 管理员上帝视角
      if (currentUserKey === "admin") {
        pending.push(instance);
        return;
      }

      // 2. 普通用户权限检查
      const currentNode = instance.definitionSnapshot.nodes.find(
        (n) => n.id === instance.currentNodeId
      );
      
      const requiredRole = currentNode?.config?.approverRole;

      const isMatch = 
        !requiredRole || 
        (currentUserKey && requiredRole.toLowerCase() === currentUserKey);

      if (isMatch) {
        pending.push(instance);
      }
    });

    return { pendingList: pending, historyList: history };
  }, [instancesMap, currentUserKey]); // 依赖项改为 currentUserKey

  // --- 表格列定义 ---
  const getColumns = (isHistory = false): ColumnsType<ProcessInstance> => [
    {
      title: "申请内容",
      key: "summary",
      render: (_, record) => (
        <div>
           <Text strong>{record.formData?.title as string || "未命名申请"}</Text>
           <br/>
           <Text type="secondary" style={{ fontSize: 12 }}>单号: {record.instanceId}</Text>
        </div>
      )
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
        
        const node = record.definitionSnapshot.nodes.find(n => n.id === text);
        const role = node?.config?.approverRole;
        
        return (
          <Space direction="vertical" size={0}>
             <Tag color="blue">{text}</Tag>
             {role && <Text type="secondary" style={{ fontSize: 10 }}>(需 {role} 审批)</Text>}
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
                style={{ color: '#52c41a' }}
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  approve(record.instanceId, userRole || "未知用户");
                  message.success("已快速通过");
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ⭐ 2. 定义角色展示配置 (新增部分)
  const getRoleTag = () => {
    switch (currentUserKey) {
      case 'admin':
        return <Tag color="red">管理员 (Admin)</Tag>;
      case 'manager':
        return <Tag color="orange">部门经理 (Manager)</Tag>;
      case 'hr':
        return <Tag color="green">人事专员 (HR)</Tag>;
      case 'finance':
        return <Tag color="cyan">财务专员 (Finance)</Tag>;
      default:
        // 如果是其他未定义的角色，显示蓝色并展示具体名称
        return <Tag color="geekblue">普通员工 ({userRole || 'User'})</Tag>;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card bordered={false}>
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>审批工作台</Title>
            <Text type="secondary">
              当前身份: {getRoleTag()} {/* ⭐ 3. 使用新的渲染函数 */}
            </Text>
          </div>
        </div>

        <Tabs
          defaultActiveKey="pending"
          items={[
            {
              key: 'pending',
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
                  locale={{ emptyText: <Empty description="暂无待办任务 (请检查当前角色是否匹配)" /> }}
                />
              )
            },
            {
              key: 'history',
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
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Approval;