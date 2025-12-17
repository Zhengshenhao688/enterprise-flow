import React, { useMemo } from "react";
import { Table, Tag, Typography, Card, Button, message, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useProcessInstanceStore, type ProcessInstance } from "../../store/processInstanceStore";

const { Title, Text } = Typography;

const Approval: React.FC = () => {
  // 1. 订阅 Store 数据
  // 只要 store.instances 发生变化（比如某个实例状态变了），组件就会自动重新渲染
  const instancesMap = useProcessInstanceStore((s) => s.instances);
  const approve = useProcessInstanceStore((s) => s.approve);

  // 2. 数据转换
  const instanceList = useMemo(() => Object.values(instancesMap), [instancesMap]);

  // 3. 定义表格列
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
        // 如果流程结束，就不显示当前节点了，显示一个横杠
        if (record.status !== "running") return <span style={{ color: "#ccc" }}>-</span>;
        return <Tag>{text}</Tag>;
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        // 目标 1: 根据状态显示不同颜色的标签
        let color = "default";
        let label = "未知";

        switch (status) {
          case "running":
            color = "processing"; // 蓝色动态
            label = "进行中";
            break;
          case "approved":
            color = "success";    // 绿色
            label = "已通过";
            break;
          case "rejected":
            color = "error";      // 红色
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
        // 目标 2: 状态检查逻辑
        const isRunning = record.status === "running";
        const isFinished = record.status === "approved";

        return (
          <Tooltip title={!isRunning ? "流程已结束，无法操作" : "点击推进流程"}>
            <Button
              type={isRunning ? "primary" : "default"}
              size="small"
              // 关键：状态不是 running 时禁用按钮
              disabled={!isRunning}
              onClick={() => {
                approve(record.instanceId);
                message.success("操作成功：流程已推进");
              }}
            >
              {isFinished ? "已完成" : "同意"}
            </Button>
          </Tooltip>
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
          locale={{ emptyText: "暂无待办任务，请先去「设计器」发起流程" }}
        />
      </Card>
    </div>
  );
};

export default Approval;