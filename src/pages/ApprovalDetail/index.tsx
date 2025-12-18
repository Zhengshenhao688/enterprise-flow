import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, Typography, Button, Descriptions, Tag, Timeline, 
  Space, Steps, Alert 
} from "antd";
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  UserOutlined 
} from "@ant-design/icons";

import { useProcessInstanceStore } from "../../store/processInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";

const { Title, Text } = Typography;

const ApprovalDetailPage: React.FC = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  
  // 1. 获取当前用户角色 (用于权限判定)
  const currentUserRole = useAuthStore((s) => s.role);
  
  // 2. 获取实例数据
  const instance = useProcessInstanceStore((s) => 
    instanceId ? s.instances[instanceId] : undefined
  );
  
  const approve = useProcessInstanceStore((s) => s.approve);
  const reject = useProcessInstanceStore((s) => s.reject);

  if (!instance) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Title level={4}>未找到审批单</Title>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  const formData = instance.formData || {};

  // =========================================================
  // 🎨 可视化增强：构建支持进度展示的 Steps 数据 (已完成步骤同步)
  // =========================================================
  const sortedNodes = [...instance.definitionSnapshot.nodes]
    .filter(n => n.type === 'approval') 
    .sort((a, b) => a.position.x - b.position.x);

  const currentStepIndex = sortedNodes.findIndex(n => n.id === instance.currentNodeId);

  const stepItems = [
    { title: '发起申请', content: '已提交', status: 'finish' as const, icon: <UserOutlined /> },
    ...sortedNodes.map((node, index) => {
      let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';
      
      const record = instance.approvalRecords?.[node.id];

      const processedCount = record?.approvedBy.length || 0;
      const totalCount = record?.assignees.length || 1;
      const isMatchAll = record?.mode === 'MATCH_ALL';
      
      if (instance.status === 'approved') {
        status = 'finish';
      } else if (instance.status === 'rejected') {
        status = index < currentStepIndex ? 'finish' : (index === currentStepIndex ? 'error' : 'wait');
      } else {
        status = index < currentStepIndex ? 'finish' : (index === currentStepIndex ? 'process' : 'wait');
      }

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

  // =========================================================
  // ⭐ 核心修复：完善权限判定逻辑 
  // =========================================================
  
  // 是否发起人
  const isCreator = instance.createdBy === currentUserRole;
  
  
  // 统一转换对比 Key
  const userRoleKey = currentUserRole?.trim().toLowerCase();

  const record = instance.approvalRecords?.[instance.currentNodeId || ""];

  const canApprove =
    instance.status === "running" &&
    !isCreator &&
    record &&
    record.assignees.includes(userRoleKey || "") &&
    !record.approvedBy.includes(userRoleKey || "") &&
    !record.rejectedBy.includes(userRoleKey || "");

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
                   onClick={() => reject(instance.instanceId, currentUserRole || 'Admin')}
                 >
                   拒绝
                 </Button>
                 <Button 
                   type="primary" 
                   size="large" 
                   icon={<CheckCircleOutlined />} 
                   onClick={() => approve(instance.instanceId, currentUserRole || 'Admin')}
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
          {canApprove && record?.mode === 'MATCH_ALL' && (
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
          <Steps 
            current={stepItems.findIndex(i => i.status === 'process')} 
            items={stepItems} 
            titlePlacement="vertical" 
          />
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
              items={instance.logs.map(log => ({
                color: log.action === 'submit' ? 'blue' : (log.action === 'approve' ? 'green' : 'red'),
                content: (
                  <div key={log.date}>
                    <Space>
                      <Text strong>{log.operator}</Text> 
                      <Tag>{log.action.toUpperCase()}</Tag>
                    </Space>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(log.date).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                )
              }))} 
            />
          </Card>
        </div>
      </Space>
    </div>
  );
};

export default ApprovalDetailPage;