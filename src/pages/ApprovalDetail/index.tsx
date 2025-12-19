import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, Typography, Button, Descriptions, Tag, Timeline, 
  Space, Steps, Alert, message
} from "antd";
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  UserOutlined,
  SwapOutlined
} from "@ant-design/icons";

import { useProcessInstanceStore } from "../../store/processInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";
import { ApprovalGuardError } from "../../utils/guards";
import { useTaskStore } from "../../store/taskStore";

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
  
  const approveTask = useTaskStore((s) => s.approveTask);
  const rejectTask = useTaskStore((s) => s.rejectTask);

  // ⭐ task 驱动：读取当前用户在该实例下的待办 task
  const tasks = useTaskStore((s) => s.tasks);

  if (!instance) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Title level={4}>未找到审批单</Title>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  if (!instance.definitionSnapshot) {
    return (
      <Alert
        style={{ margin: 40 }}
        message="审批单正在初始化中，请稍后刷新页面。"
        type="info"
        showIcon
      />
    );
  }

  const formData = instance.formData || {};

  const myPendingTask = tasks.find(
    (t) =>
      t.instanceId === instance.instanceId &&
      t.assigneeRole === currentUserRole &&
      t.status === "pending"
  );

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
      const totalCount = record?.assignees.length || 0;
      const isMatchAll = record?.mode === 'MATCH_ALL';
      const isMatchAny = record?.mode === 'MATCH_ANY';
      
      if (instance.status === 'approved') {
        status = 'finish';
      } else if (instance.status === 'rejected') {
        status = index < currentStepIndex ? 'finish' : (index === currentStepIndex ? 'error' : 'wait');
      } else {
        status = index < currentStepIndex ? 'finish' : (index === currentStepIndex ? 'process' : 'wait');
      }

      let progressDesc = `审核人: ${node.config?.approverRole || '任意人员'}`;

      if (status === 'finish') {
        if (isMatchAny) {
          progressDesc = processedCount >= 1 ? "或签：已有人通过" : `或签进行中 (0/${totalCount})`;
        } else if (isMatchAll) {
          progressDesc = (processedCount >= totalCount && totalCount > 0) ? `会签完成 (${processedCount}/${totalCount})` : `会签进行中 (${processedCount}/${totalCount})`;
        }
      } else if (status === 'process') {
        if (isMatchAny) {
          progressDesc = processedCount >= 1 ? "或签：已有人通过" : `或签进行中 (0/${totalCount})`;
        } else if (isMatchAll) {
          progressDesc = (processedCount >= totalCount && totalCount > 0) ? `会签完成 (${processedCount}/${totalCount})` : `会签进行中 (${processedCount}/${totalCount})`;
        }
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
  
  const canApprove =
    instance.status === "running" &&
    !isCreator &&
    !!myPendingTask;

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
                   onClick={() => {
                     try {
                       if (!myPendingTask) {
                         message.error("未找到你的待办任务，无法执行审批操作");
                         return;
                       }
                       rejectTask(myPendingTask.id);
                     } catch (e) {
                       if (e instanceof ApprovalGuardError) {
                         message.error(e.message);
                         return;
                       }
                       throw e;
                     }
                   }}
                 >
                   拒绝
                 </Button>
                 <Button 
                   type="primary" 
                   size="large" 
                   icon={<CheckCircleOutlined />} 
                   onClick={() => {
                     try {
                       if (!myPendingTask) {
                         message.error("未找到你的待办任务，无法执行审批操作");
                         return;
                       }
                       approveTask(myPendingTask.id);
                     } catch (e) {
                       if (e instanceof ApprovalGuardError) {
                         message.error(e.message);
                         return;
                       }
                       throw e;
                     }
                   }}
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
          {canApprove && instance.approvalRecords?.[instance.currentNodeId || ""]?.mode === 'MATCH_ALL' && (
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
              items={instance.logs.map((log) => {
                let color: string = "blue";
                let icon: React.ReactNode = <UserOutlined />;
                let actionText = "";

                switch (log.action) {
                  case "submit":
                    color = "blue";
                    icon = <UserOutlined />;
                    actionText = "提交申请";
                    break;
                  case "approve":
                    color = "green";
                    icon = <CheckCircleOutlined />;
                    actionText = "通过审批";
                    break;
                  case "reject":
                    color = "red";
                    icon = <CloseCircleOutlined />;
                    actionText = "驳回审批";
                    break;
                  case "delegate":
                    color = "orange";
                    icon = <SwapOutlined />;
                    actionText = "委派审批";
                    break;
                  default:
                    actionText = log.action;
                }

                return {
                  color,
                  dot: icon,
                  content: (
                    <div key={log.date}>
                      <Space>
                        <Text strong>{log.operator}</Text>
                        <Text>{actionText}</Text>
                      </Space>

                      {log.comment && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {log.comment}
                          </Text>
                        </div>
                      )}

                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(log.date).toLocaleString()}
                        </Text>
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </Card>
        </div>
      </Space>
    </div>
  );
};

export default ApprovalDetailPage;