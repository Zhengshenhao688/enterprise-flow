import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Typography, Button, Descriptions, Tag, Timeline, Space, Steps } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, UserOutlined } from "@ant-design/icons";
import { useProcessInstanceStore } from "../../store/processInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";

const { Title, Text } = Typography;

const ApprovalDetailPage: React.FC = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const currentUserRole = useAuthStore((s) => s.role);
  const instance = useProcessInstanceStore((s) => instanceId ? s.instances[instanceId] : undefined);
  const approve = useProcessInstanceStore((s) => s.approve);
  const reject = useProcessInstanceStore((s) => s.reject);

  if (!instance) return <div style={{ padding: 40, textAlign: "center" }}><Title level={4}>未找到审批单</Title><Button onClick={() => navigate(-1)}>返回</Button></div>;

  const formData = instance.formData || {}; // [cite: 190]

  // =========================================================
  // 🎨 可视化增强：构建支持进度展示的 Steps 数据
  // =========================================================
  const sortedNodes = [...instance.definitionSnapshot.nodes]
    .filter(n => n.type === 'approval') 
    .sort((a, b) => a.position.x - b.position.x);

  const currentStepIndex = sortedNodes.findIndex(n => n.id === instance.currentNodeId);

  const stepItems = [
    { title: '发起申请', description: '已提交', status: 'finish' as const, icon: <UserOutlined /> },
    ...sortedNodes.map((node, index) => {
      let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';
      
      // 提取实时进度数据
      const processedCount = node.config?.processedUsers?.length || 0;
      const totalCount = node.config?.approverList?.length || 1;
      const isMatchAll = node.config?.approvalMode === 'MATCH_ALL';
      
      if (instance.status === 'approved') {
        status = 'finish';
      } else if (instance.status === 'rejected') {
        status = index < currentStepIndex ? 'finish' : (index === currentStepIndex ? 'error' : 'wait');
      } else {
        status = index < currentStepIndex ? 'finish' : (index === currentStepIndex ? 'process' : 'wait');
      }

      // ✅ 动态生成包含进度的描述文案
      let progressDesc = `审核人: ${node.config?.approverRole || '任意人员'}`;
      if (status === 'process') {
        progressDesc = `${isMatchAll ? '会签' : '或签'}进度: ${processedCount}/${totalCount} 人已通过`;
      } else if (status === 'finish') {
        progressDesc = `已完成审批 (${processedCount}/${totalCount})`;
      }

      return { title: node.name, description: progressDesc, status };
    }),
    { 
      title: '流程结束', 
      description: instance.status === 'approved' ? '已归档' : (instance.status === 'rejected' ? '已终止' : '等待结果'),
      status: instance.status === 'approved' ? 'finish' as const : (instance.status === 'rejected' ? 'error' as const : 'wait' as const),
    }
  ];

  // 权限检查
  const currentNode = instance.definitionSnapshot.nodes.find(n => n.id === instance.currentNodeId);
  const requiredRole = currentNode?.config?.approverRole;
  const userRoleKey = currentUserRole?.trim().toLowerCase();
  const requiredRoleKey = requiredRole?.trim().toLowerCase();
  const canOperate = instance.status === "running" && (userRoleKey === "admin" || (!requiredRoleKey) || userRoleKey === requiredRoleKey);

  return (
    <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100vh" }}>
      <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回审批列表</Button>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Title level={4}>{(formData.title as string) || '无标题'}</Title>
              <Space>
                <Tag color={instance.status === 'running' ? 'blue' : (instance.status === 'approved' ? 'green' : 'red')}>
                  {instance.status === 'running' ? '审批中' : (instance.status === 'approved' ? '已通过' : '已驳回')}
                </Tag>
                <Text type="secondary">单号: {instance.instanceId}</Text>
              </Space>
            </div>
            {canOperate && (
              <Space>
                 <Button danger size="large" icon={<CloseCircleOutlined />} onClick={() => reject(instance.instanceId, currentUserRole || 'Admin')}>拒绝</Button>
                 <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={() => approve(instance.instanceId, currentUserRole || 'Admin')}>通过</Button>
              </Space>
            )}
          </div>
        </Card>

        <Card title="流程进度" bordered={false}>
          <Steps current={stepItems.findIndex(i => i.status === 'process')} items={stepItems} labelPlacement="vertical" />
        </Card>

        <div style={{ display: "flex", gap: 24 }}>
          <Card title="申请详情" bordered={false} style={{ flex: 1 }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="申请标题"><Text strong>{(formData.title as string) || '-'}</Text></Descriptions.Item>
              <Descriptions.Item label="申请事由">{(formData.reason as string) || '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{new Date(instance.createdAt).toLocaleString()}</Descriptions.Item>
            </Descriptions>
          </Card>
          <Card title="审批动态" bordered={false} style={{ width: 400 }}>
            <Timeline items={instance.logs.map(log => ({
              color: log.action === 'submit' ? 'blue' : (log.action === 'approve' ? 'green' : 'red'),
              children: (<div><Text strong>{log.operator}</Text> <Tag>{log.action.toUpperCase()}</Tag><div>{new Date(log.date).toLocaleString()}</div></div>)
            }))} />
          </Card>
        </div>
      </Space>
    </div>
  );
};

export default ApprovalDetailPage;