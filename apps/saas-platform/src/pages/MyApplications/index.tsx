import React, { useMemo } from "react";
import { Table, Tag, Typography, Empty, Space } from "antd";
import { useNavigate } from "react-router-dom";

import {useAuthStore} from "../../store/useAuthStore";
import { useProcessInstanceStore } from "../../store/processInstanceStore";
import type { ProcessInstance } from "../../types/process";
import { buildApprovalPath, getDefinitionSnapshot } from "@project/workflow-sdk";
import { useTaskStore } from "../../store/taskStore";
import { StatusTag, PageContainer } from "@project/ui-components";

const { Text } = Typography;

type InstanceRecord = ProcessInstance;

const MyApplications: React.FC = () => {
  const navigate = useNavigate();

  const role = useAuthStore((s) => s.role);
  const instanceMap = useProcessInstanceStore((s) => s.instances);

  /**
   * 仅展示「我发起的流程实例」
   * 增加 currentApprovalLabel 和 pendingApproverRoles 字段
   */
  const tasks = useTaskStore((s) => s.tasks);

  const myApplications = useMemo(() => {
    if (!role) return [];

    return Object.values(instanceMap)
      .filter((i) => i.createdBy === role)
      .map((instance) => {
        if (instance.status !== "running") {
          return instance;
        }

        const def = getDefinitionSnapshot(instance);
        if (!def) {
          return instance;
        }

        const path = buildApprovalPath(def, {
          form: instance.formData ?? {},
        });

        const current = path.find(
          (p) => p.id === instance.currentNodeId
        );

        const pendingApproverRoles = tasks
          .filter(
            (t) =>
              t.instanceId === instance.instanceId &&
              t.status === "pending"
          )
          .map((t) => t.assigneeRole);

        return {
          ...instance,
          currentApprovalLabel: current?.label ?? "-",
          pendingApproverRoles,
        };
      });
  }, [instanceMap, role, tasks]);

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
        if (record.status !== "running") {
          return <Text type="secondary">-</Text>;
        }

        if (!record.currentApprovalLabel) {
          return <Text type="secondary">流程初始化中</Text>;
        }

        return (
          <Space direction="vertical" size={2}>
            <Tag color="blue">{record.currentApprovalLabel}</Tag>

            {Array.isArray(record.pendingApproverRoles) &&
              record.pendingApproverRoles.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  待审批：{record.pendingApproverRoles.join("、")}
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
        if (status !== "running" && status !== "approved" && status !== "rejected") {
          return <Tag>{status}</Tag>;
        }

        return <StatusTag status={status} />;
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
    <PageContainer title="我发起的申请">
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
    </PageContainer>
  );
};

export default MyApplications;