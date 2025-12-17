import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, Descriptions, Tag, Typography, Empty, Space, message, } from "antd"; // 1. 引入 message, Divider
import { ArrowLeftOutlined, CheckCircleOutlined, FileTextOutlined } from "@ant-design/icons"; // 2. 引入图标
import { useProcessInstanceStore } from "../../store/processInstanceStore";

const { Title, Paragraph } = Typography;

const ApprovalDetail: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();

  // 3. 获取数据与方法
  const instance = useProcessInstanceStore((s) => 
    instanceId ? s.instances[instanceId] : undefined
  );
  const approve = useProcessInstanceStore((s) => s.approve); // 获取审批方法

  // 防御性检查
  if (!instance) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Empty description="找不到该审批任务" />
        <Button type="primary" onClick={() => navigate("/approval")} style={{ marginTop: 16 }}>返回列表</Button>
      </div>
    );
  }

  // 4. 定义审批操作处理函数
  const handleApprove = () => {
    if (instanceId) {
      // A. 调用 Store 核心方法推进流程
      approve(instanceId);
      
      // B. 给出反馈
      message.success("审批已通过，流程成功推进");
      
      // C. 跳转回列表页 (符合用户习惯的操作流：处理完 -> 回到清单处理下一个)
      navigate("/approval");
    }
  };

  // 辅助变量
  const isRunning = instance.status === "running";
  // 安全获取表单数据 (处理 unknown 类型)
  const formData = instance.formData || {};
  const formTitle = String(formData['title'] || '未填写');
  const formReason = String(formData['reason'] || '未填写');

  // 状态渲染辅助函数
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
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              单号: {instance.instanceId}
            </Typography.Text>
          </div>
        </Space>
      </Card>

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* === 区域 1: 流程基础信息 === */}
        <Card bordered={false} style={{ marginBottom: 24 }}>
          <Descriptions title="流程信息" column={2}>
            <Descriptions.Item label="流程名称">
              <strong>{instance.definitionSnapshot.name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="当前状态">
              {renderStatusTag(instance.status)}
            </Descriptions.Item>
            <Descriptions.Item label="当前节点">
              {isRunning ? <Tag color="blue">{instance.currentNodeId}</Tag> : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {new Date(instance.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* === 区域 2: 业务表单数据 (Step 7.3) === */}
        <Card 
          title={<Space><FileTextOutlined /><span>申请内容</span></Space>} 
          bordered={false} 
          style={{ marginBottom: 24 }}
        >
          {/* 这里我们不再通用渲染，而是根据业务需求(ApplyPage)明确渲染特定字段 */}
          <Descriptions column={1} bordered>
            <Descriptions.Item label="申请标题">
              <span style={{ fontSize: 16, fontWeight: 500 }}>{formTitle}</span>
            </Descriptions.Item>
            <Descriptions.Item label="申请事由 / 备注">
              <span style={{ whiteSpace: "pre-wrap" }}>{formReason}</span>
            </Descriptions.Item>
          </Descriptions>
          
          {/* 如果有额外未知的字段，也可以在这里做一个折叠面板展示，暂时省略 */}
        </Card>

        {/* === 区域 3: 审批操作区 (Step 7.4) === */}
        <Card title="审批处理" bordered={false} className="approval-action-card">
          {isRunning ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ marginBottom: 24, color: "#666" }}>
                <Paragraph>
                  请仔细核对上述申请内容。点击“同意”后，流程将流转至下一节点或结束。
                </Paragraph>
              </div>
              <Space size="large">
                {/* 暂时不做拒绝功能 */}
                <Button disabled>拒绝 / 退回</Button> 
                
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
            // 非运行状态显示的提示
            <div style={{ textAlign: "center", padding: "30px 0", color: "#8c8c8c" }}>
              <CheckCircleOutlined style={{ fontSize: 32, color: "#52c41a", marginBottom: 12 }} />
              <Title level={5} style={{ color: "#52c41a" }}>流程已结束</Title>
              <p>该申请已完成审批，无法进行操作。</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ApprovalDetail;