import React, { useMemo } from "react";
import { Table, Tag, Typography, Card, Button, message, Tooltip, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom"; // 1. 引入路由跳转钩子
import { useProcessInstanceStore, type ProcessInstance } from "../../store/processInstanceStore";

const { Title, Text } = Typography;

const Approval: React.FC = () => {
  const navigate = useNavigate(); // 2. 初始化跳转函数

  // 订阅 Store 数据
  const instancesMap = useProcessInstanceStore((s) => s.instances);
  const approve = useProcessInstanceStore((s) => s.approve);

  // 数据转换
  const instanceList = useMemo(() => Object.values(instancesMap), [instancesMap]);

  // 定义表格列
  const columns: ColumnsType<ProcessInstance> = [
    {
      title: "实例 ID",
      dataIndex: "instanceId",
      key: "instanceId",
      width: 120,
      render: (text) => <Text copyable={{ text }} ellipsis>{text}</Text>,
    },
    {
      title: "流程名称",
      key: "processName",
      render: (_, record) => <strong>{record.definitionSnapshot.name}</strong>,
    },
    {
      title: "当前节点 ID",
      dataIndex: "currentNodeId",
      key: "currentNodeId",
      render: (text, record) => {
        if (record.status !== "running") return <span style={{ color: "#ccc" }}>-</span>;
        return <Tag>{text}</Tag>;
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "default";
        let label = "未知";

        switch (status) {
          case "running":
            color = "processing";
            label = "进行中";
            break;
          case "approved":
            color = "success";
            label = "已通过";
            break;
          case "rejected":
            color = "error";
            label = "已拒绝";
            break;
        }
        
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => {
        const isRunning = record.status === "running";
        const isFinished = record.status === "approved";

        return (
          <Space>
            {/* 🆕 新增：查看详情按钮 */}
            <Button 
              type="link" 
              size="small"
              onClick={() => navigate(`/approval/${record.instanceId}`)}
            >
              详情
            </Button>

            {/* 原有功能：快速审批按钮 */}
            <Tooltip title={!isRunning ? "流程已结束，无法操作" : "点击推进流程"}>
              <Button
                type={isRunning ? "primary" : "default"}
                size="small"
                disabled={!isRunning}
                onClick={() => {
                  approve(record.instanceId);
                  message.success("操作成功：流程已推进");
                }}
              >
                {isFinished ? "已完成" : "同意"}
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card bordered={false}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={4} style={{ margin: 0 }}>审批工作台</Title>
          <Text type="secondary">共 {instanceList.length} 个任务</Text>
        </div>

        <Table
          dataSource={instanceList}
          columns={columns}
          rowKey="instanceId"
          pagination={false}
          locale={{ emptyText: "暂无待办任务，请先去「设计器」或「员工服务台」发起流程" }}
        />
      </Card>
    </div>
  );
};

export default Approval;