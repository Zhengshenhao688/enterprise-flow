import React from "react";
import { useParams, useNavigate } from "react-router-dom";
// 🆕 1. 引入 Timeline 组件
import { Card, Button, Descriptions, Tag, Typography, Empty, Space, message, Timeline } from "antd";
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  FileTextOutlined,
  ClockCircleOutlined 
} from "@ant-design/icons";
import { useProcessInstanceStore } from "../../store/processInstanceStore";

const { Title, Paragraph, Text } = Typography;

const ApprovalDetail: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();

  const instance = useProcessInstanceStore((s) => 
    instanceId ? s.instances[instanceId] : undefined
  );
  const approve = useProcessInstanceStore((s) => s.approve);
  // 🆕 2. 获取 reject 方法
  const reject = useProcessInstanceStore((s) => s.reject);

  if (!instance) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Empty description="找不到该审批任务" />
        <Button type="primary" onClick={() => navigate("/approval")} style={{ marginTop: 16 }}>返回列表</Button>
      </div>
    );
  }

  // 同意处理
  const handleApprove = () => {
    if (instanceId) {
      approve(instanceId, "管理员"); // 这里可以传入当前登录用户名
      message.success("审批已通过");
      // 保持在当前页，让用户看到 timeline 变化，或者跳回列表均可
      // navigate("/approval"); 
    }
  };

  // 🆕 3. 拒绝处理
  const handleReject = () => {
    if (instanceId) {
      reject(instanceId, "管理员");
      message.error("审批已拒绝，流程终止");
    }
  };

  const isRunning = instance.status === "running";
  const formData = instance.formData || {};
  const formTitle = String(formData['title'] || '未填写');
  const formReason = String(formData['reason'] || '未填写');

  const renderStatusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      running: { color: "processing", text: "进行中" },
      approved: { color: "success", text: "已通过" },
      rejected: { color: "error", text: "已拒绝" },
    };
    const current = map[status] || { color: "default", text: status };
    return <Tag color={current.color}>{current.text}</Tag>;
  };

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      {/* 顶部导航 */}
      <Card bordered={false} style={{ marginBottom: 24 }}>
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/approval")} type="text" />
          <div>
            <Title level={4} style={{ margin: 0 }}>审批详情</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>单号: {instance.instanceId}</Text>
          </div>
        </Space>
      </Card>

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* 区域 1: 基础信息 */}
        <Card bordered={false} style={{ marginBottom: 24 }}>
          <Descriptions title="流程信息" column={2}>
            <Descriptions.Item label="流程名称"><strong>{instance.definitionSnapshot.name}</strong></Descriptions.Item>
            <Descriptions.Item label="当前状态">{renderStatusTag(instance.status)}</Descriptions.Item>
            <Descriptions.Item label="当前节点">
              {isRunning ? <Tag color="blue">{instance.currentNodeId}</Tag> : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {new Date(instance.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 区域 2: 业务表单 */}
        <Card title={<Space><FileTextOutlined /><span>申请内容</span></Space>} bordered={false} style={{ marginBottom: 24 }}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="申请标题">
              <span style={{ fontSize: 16, fontWeight: 500 }}>{formTitle}</span>
            </Descriptions.Item>
            <Descriptions.Item label="申请事由 / 备注">
              <span style={{ whiteSpace: "pre-wrap" }}>{formReason}</span>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 🆕 区域 3: 审批记录 (Timeline) */}
        <Card title={<Space><ClockCircleOutlined /><span>审批记录</span></Space>} bordered={false} style={{ marginBottom: 24 }}>
          <div style={{ marginTop: 12 }}>
            <Timeline 
              items={instance.logs?.map(log => ({
                color: log.action === 'reject' ? 'red' : log.action === 'approve' ? 'green' : 'blue',
                children: (
                  <>
                    <Text strong>{log.operator}</Text> 
                    <Text type="secondary" style={{ marginLeft: 8 }}>{new Date(log.date).toLocaleString()}</Text>
                    <div style={{ marginTop: 4 }}>
                      <Tag>{log.action === 'submit' ? '发起' : log.action === 'approve' ? '通过' : '拒绝'}</Tag>
                      {log.comment}
                    </div>
                  </>
                )
              }))}
            />
          </div>
        </Card>

        {/* 区域 4: 操作区 */}
        <Card title="审批处理" bordered={false} className="approval-action-card">
          {isRunning ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ marginBottom: 24, color: "#666" }}>
                <Paragraph>请仔细核对上述申请内容。点击操作后流程将自动流转。</Paragraph>
              </div>
              <Space size="large">
                {/* 🆕 4. 绑定拒绝按钮 */}
                <Button 
                  danger 
                  size="large" 
                  icon={<CloseCircleOutlined />}
                  onClick={handleReject}
                >
                  拒绝 / 驳回
                </Button> 
                
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<CheckCircleOutlined />} 
                  onClick={handleApprove}
                >
                  同意申请
                </Button>
              </Space>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#8c8c8c" }}>
              {/* 根据状态显示不同图标 */}
              {instance.status === 'approved' ? (
                <CheckCircleOutlined style={{ fontSize: 32, color: "#52c41a", marginBottom: 12 }} />
              ) : (
                <CloseCircleOutlined style={{ fontSize: 32, color: "#ff4d4f", marginBottom: 12 }} />
              )}
              <Title level={5} style={{ color: instance.status === 'approved' ? "#52c41a" : "#ff4d4f" }}>
                {instance.status === 'approved' ? "流程已通过" : "流程已被拒绝"}
              </Title>
              <p>该申请已结束，无法进行操作。</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ApprovalDetail;