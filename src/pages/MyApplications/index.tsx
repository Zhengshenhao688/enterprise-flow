import React, { useMemo } from "react";
import { Card, Table, Tag, Typography, Empty } from "antd";
import { useNavigate } from "react-router-dom";

import {useAuthStore} from "../../store/useAuthStore";
import { useProcessInstanceStore } from "../../store/processInstanceStore";
import type { ProcessInstance } from "../../store/processInstanceStore";
import type { FlowNode } from "../../types/flow";

const { Text } = Typography;

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  running: { text: "进行中", color: "processing" },
  approved: { text: "已通过", color: "success" },
  rejected: { text: "已拒绝", color: "error" },
};

type InstanceRecord = ProcessInstance;

const MyApplications: React.FC = () => {
  const navigate = useNavigate();

  const role = useAuthStore((s) => s.role);
  const instanceMap = useProcessInstanceStore((s) => s.instances);

  /**
   * 仅展示「我发起的流程实例」
   */
  const myApplications = useMemo(() => {
    if (!role) return [];

    return Object.values(instanceMap).filter(
      (i) => i.createdBy === role
    );
  }, [instanceMap, role]);

  const columns = [
    {
      title: "流程名称",
      dataIndex: "title",
      key: "title",
      render: (title: string) => <Text strong>{title || "-"}</Text>,
    },
    {
      title: "当前节点",
      key: "currentNode",
      render: (_: unknown, record: InstanceRecord) => {
        const nodes = record.definitionSnapshot?.nodes;
        if (!nodes) return "-";

        const node = nodes.find(
          (n: FlowNode) => n.id === record.currentNodeId
        );

        return node ? node.name : "-";
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const cfg = STATUS_MAP[status];
        return <Tag color={cfg?.color}>{cfg?.text || status}</Tag>;
      },
    },
    {
      title: "提交时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (t: number) =>
        new Date(t).toLocaleString("zh-CN", {
          hour12: false,
        }),
    },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: InstanceRecord) => (
        <a
          onClick={() =>
            navigate(`/approval-detail/${record.instanceId}`)
          }
        >
          查看详情
        </a>
      ),
    },
  ];

  return (
    <Card title="我发起的申请" style={{ height: "100%" }}>
      {myApplications.length === 0 ? (
        <Empty description="暂无我发起的申请" />
      ) : (
        <Table
          rowKey="instanceId"
          columns={columns}
          dataSource={myApplications}
          pagination={{ pageSize: 5 }}
        />
      )}
    </Card>
  );
};

export default MyApplications;