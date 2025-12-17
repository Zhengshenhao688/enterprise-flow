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
  
  // 1. 获取当前用户 (用于权限判断)
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
        <Title level={4}>未找到该审批单</Title>
        <Button onClick={() => navigate(-1)}>返回列表</Button>
      </div>
    );
  }

  // ✅ 核心修复：安全提取 formData
  // 如果 instance.formData 是 undefined，就给一个空对象 {}
  // 这样下面的代码绝对不会报错
  const formData = instance.formData || {};

  // =========================================================
  // 🎨 可视化核心逻辑：构建 Steps 数据
  // =========================================================
  
  const sortedNodes = [...instance.definitionSnapshot.nodes]
    .filter(n => n.type === 'approval') 
    .sort((a, b) => a.position.x - b.position.x);

  const currentStepIndex = sortedNodes.findIndex(n => n.id === instance.currentNodeId);

  const stepItems = [
    { 
      title: '发起申请', 
      description: '已提交', 
      status: 'finish' as const,
      icon: <UserOutlined /> 
    },
    ...sortedNodes.map((node, index) => {
      let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';
      
      if (instance.status === 'approved') {
        status = 'finish';
      } else if (instance.status === 'rejected') {
        if (index < currentStepIndex) status = 'finish';
        else if (index === currentStepIndex) status = 'error'; 
        else status = 'wait';
      } else {
        if (index < currentStepIndex) status = 'finish';
        else if (index === currentStepIndex) status = 'process';
        else status = 'wait';
      }

      const roleName = node.config?.approverRole || '任意人员';

      return {
        title: node.name,
        description: `审核人: ${roleName}`,
        status: status,
      };
    }),
    { 
      title: '流程结束', 
      description: instance.status === 'approved' ? '已归档' : (instance.status === 'rejected' ? '已终止' : '等待结果'),
      status: instance.status === 'approved' ? 'finish' as const : (instance.status === 'rejected' ? 'error' as const : 'wait' as const),
    }
  ];

  // =========================================================
  // 🔐 权限检查逻辑
  // =========================================================
  
  const currentNode = instance.definitionSnapshot.nodes.find(n => n.id === instance.currentNodeId);
  const requiredRole = currentNode?.config?.approverRole;
  
  const userRoleKey = currentUserRole?.trim().toLowerCase();
  const requiredRoleKey = requiredRole?.trim().toLowerCase();
  
  const canOperate = 
    instance.status === "running" && 
    (userRoleKey === "admin" || (!requiredRoleKey) || userRoleKey === requiredRoleKey);

  return (
    <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100vh" }}>
      {/* 顶部返回 */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        type="link" 
        onClick={() => navigate(-1)} 
        style={{ marginBottom: 16, paddingLeft: 0, fontSize: 16 }}
      >
        返回审批列表
      </Button>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        
        {/* 1. 状态概览卡片 (含操作按钮) */}
        <Card bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {/* ✅ 修复：使用安全的 formData */}
              <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                {(formData.title as string) || '无标题'}
              </Title>
              <Space>
                <Tag color={instance.status === 'running' ? 'blue' : (instance.status === 'approved' ? 'green' : 'red')}>
                  {instance.status === 'running' ? '审批中' : (instance.status === 'approved' ? '已通过' : '已驳回')}
                </Tag>
                <Text type="secondary">单号: {instance.instanceId}</Text>
              </Space>
            </div>
            
            {canOperate && (
              <Space>
                 <Button danger size="large" icon={<CloseCircleOutlined />} onClick={() => reject(instance.instanceId)}>
                   拒绝
                 </Button>
                 <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={() => approve(instance.instanceId, currentUserRole || 'Admin')}>
                   通过
                 </Button>
              </Space>
            )}
          </div>

          {!canOperate && instance.status === 'running' && (
             <Alert 
               message={`当前节点等待 [${requiredRole || '任意人员'} 审批]`} 
               description={`您当前登录身份为 [${currentUserRole || '访客'}]，无权处理此任务。`}
               type="warning" 
               showIcon 
               style={{ marginTop: 16 }}
             />
          )}
        </Card>

        {/* 2. 流程可视化进度条 */}
        <Card title="流程进度" bordered={false}>
          <div style={{ padding: '20px 0' }}>
            <Steps 
              current={stepItems.findIndex(i => i.status === 'process')} 
              items={stepItems} 
              labelPlacement="vertical" 
            />
          </div>
        </Card>

        {/* 3. 详情与日志 分栏布局 */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          
          {/* 左侧：申请详情 */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <Card title="申请详情" bordered={false} style={{ height: '100%' }}>
              <Descriptions column={1} bordered size="middle">
                <Descriptions.Item label="申请标题">
                  {/* ✅ 修复：使用安全的 formData */}
                  <Text strong>{(formData.title as string) || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="申请事由">
                  <span style={{ whiteSpace: 'pre-wrap' }}>{(formData.reason as string) || '-'}</span>
                </Descriptions.Item>
                <Descriptions.Item label="提交时间">
                  {new Date(instance.createdAt).toLocaleString()}
                </Descriptions.Item>
                
                {/* ✅ 修复：使用 Object.entries(formData) */}
                {Object.entries(formData).map(([k, v]) => {
                  if (k === 'title' || k === 'reason') return null;
                  return <Descriptions.Item label={k} key={k}>{String(v)}</Descriptions.Item>;
                })}
              </Descriptions>
            </Card>
          </div>

          {/* 右侧：审批动态 */}
          <div style={{ width: 400, flexShrink: 0 }}>
             <Card title="审批动态" bordered={false} style={{ height: '100%' }}>
               <Timeline
                 items={instance.logs.map(log => ({
                   color: log.action === 'submit' ? 'blue' : (log.action === 'approve' ? 'green' : 'red'),
                   children: (
                     <>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text strong>{log.operator}</Text> 
                          <Tag>{log.action.toUpperCase()}</Tag>
                       </div>
                       <div style={{ marginTop: 4 }}>
                         <Text type="secondary" style={{ fontSize: 12 }}>
                           {new Date(log.date).toLocaleString()}
                         </Text>
                       </div>
                     </>
                   )
                 }))}
               />
             </Card>
          </div>
        </div>

      </Space>
    </div>
  );
};

export default ApprovalDetailPage;