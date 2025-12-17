import React from "react";
import { Card, Typography, Layout, Button, Form, Input, message, Steps } from "antd";
import { useNavigate } from "react-router-dom";
import { useFlowStore } from "../../store/flowStore";
import { useProcessInstanceStore } from "../../store/processInstanceStore";

const { Title, Paragraph } = Typography;
const { Content } = Layout;
const { TextArea } = Input;

// 定义表单数据类型
interface ApplyFormData {
  title: string;
  reason: string;
}

const ApplyPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // 1. 获取 Store 方法
  // 注意：真实场景中，Apply页应该调用 API 获取“已发布”的流程，
  // 这里为了演示闭环，我们直接从 flowStore (设计器) 获取当前的草稿
  const getProcessDefinition = useFlowStore((s) => s.getProcessDefinition);
  const startProcess = useProcessInstanceStore((s) => s.startProcess);

  // 2. 提交处理逻辑
  const onFinish = (values: ApplyFormData) => {
    console.log("表单数据:", values);

    // Step A: 获取流程模板
    const definition = getProcessDefinition();

    // 简单校验：如果没有节点，说明管理员还没画图
    if (!definition || definition.nodes.length === 0) {
      message.error("当前没有可用的流程模板，请先去设计器绘制流程！");
      return;
    }

    try {
      // Step B: 调用引擎，传入表单数据
      const instanceId = startProcess(definition, values as unknown as Record<string, unknown>);

      message.success(`申请已提交！实例ID: ${instanceId}`);

      // Step C: 路由跳转到审批中心
      navigate("/approval");
    } catch (error) {
      message.error("流程发起失败");
      console.error(error);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <div style={{ background: "#fff", padding: "0 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 64, display: "flex", alignItems: "center" }}>
          <Title level={4} style={{ margin: 0 }}>EnterpriseFlow · 员工服务台</Title>
        </div>
      </div>

      <Content style={{ maxWidth: 1200, margin: "24px auto", width: "100%", padding: "0 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>员工发起申请</Title>
          <Paragraph type="secondary">
            请填写下方的业务详情，确认无误后提交审批。
          </Paragraph>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {/* 左侧：业务表单 */}
          <div style={{ flex: 1 }}>
            <Card title="通用业务申请单" bordered={false}>
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ title: "", reason: "" }}
              >
                {/* 表单字段 1 */}
                <Form.Item
                  label="申请标题"
                  name="title"
                  rules={[{ required: true, message: "请输入申请标题" }]}
                >
                  <Input placeholder="例如：采购办公用品 / 申请年假" size="large" />
                </Form.Item>

                {/* 表单字段 2 */}
                <Form.Item
                  label="申请事由 / 备注"
                  name="reason"
                  rules={[{ required: true, message: "请填写具体事由" }]}
                >
                  <TextArea rows={6} placeholder="请详细描述您的申请原因..." />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large" block>
                    🚀 立即提交申请
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>

          {/* 右侧：辅助信息 */}
          <div style={{ width: 320 }}>
            <Card title="流程预览" bordered={false}>
              <Steps
                direction="vertical"
                size="small"
                current={0}
                items={[
                  { title: '填写申请', description: '当前步骤' },
                  { title: '自动流转', description: '系统处理' },
                  { title: '审批结束', description: '等待结果' },
                ]}
              />
            </Card>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default ApplyPage;