import React, { useState } from "react";
import { Card, Typography, Layout, Button, Form, Input, message, Steps, Select, Empty, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useFlowStore } from "../../store/flowStore";
import { useProcessInstanceStore } from "../../store/processInstanceStore";

const { Title, Paragraph, Text } = Typography;
const { Content } = Layout;
const { TextArea } = Input;

// ✅ 修复点：添加 [key: string]: any 索引签名
// 这告诉 TypeScript：这个对象除了 title/reason，还可以当做普通对象来处理
interface ApplyFormData extends Record<string, unknown> {
  title: string;
  reason: string;
}

const ApplyPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const publishedFlows = useFlowStore((s) => s.publishedFlows);
  const startProcess = useProcessInstanceStore((s) => s.startProcess);

  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  const onFinish = async (values: ApplyFormData) => {
    if (!selectedFlowId) {
      message.error("请先选择一个审批流程类型！");
      return;
    }

    const targetFlow = publishedFlows.find(f => f.id === selectedFlowId);
    
    if (!targetFlow) {
      message.error("未找到该流程模板，可能已被删除");
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // 这里的 values 现在可以安全地传给 startProcess 了
      const instanceId = startProcess(targetFlow, values);
      
      message.success(`申请提交成功！(单号: ${instanceId})`);
      navigate("/approval");
    } catch (error) {
      message.error("流程发起失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectedFlow = publishedFlows.find(f => f.id === selectedFlowId);
  const previewSteps = selectedFlow 
    ? [
        { title: '发起申请', status: 'finish' as const },
        ...selectedFlow.nodes
          .filter(n => n.type === 'approval')
          .map(n => ({ 
            title: n.name, 
            description: n.config?.approverRole ? `审核: ${n.config.approverRole}` : '审批节点' 
          })),
        { title: '流程结束', status: 'wait' as const }
      ]
    : [
        { title: '填写申请', description: '待开始' },
        { title: '选择流程', description: '请先选择业务类型' },
        { title: '审批结束', description: '...' },
      ];

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
            请选择业务类型并填写详情，系统将自动匹配审批流。
          </Paragraph>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* 左侧：表单区 */}
          <div style={{ flex: 1 }}>
            <Card title="业务申请单" bordered={false}>
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ title: "", reason: "" }}
              >
                <Form.Item
                  label="选择审批流程"
                  required
                  tooltip="请选择您要办理的业务类型，不同类型对应不同的审批人"
                >
                  <Select 
                    size="large"
                    placeholder="请选择业务类型（如：请假、报销...）"
                    onChange={(val) => setSelectedFlowId(val)}
                    notFoundContent={<Empty description="暂无已发布的流程，请联系管理员发布模板" />}
                  >
                    {publishedFlows.map(flow => (
                      <Select.Option key={flow.id} value={flow.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{flow.name}</span>
                          <Tag>{flow.nodes.length} 个节点</Tag>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="申请标题"
                  name="title"
                  rules={[{ required: true, message: "请输入申请标题" }]}
                >
                  <Input placeholder="例如：采购办公用品 / 申请年假" size="large" />
                </Form.Item>

                <Form.Item
                  label="申请事由 / 备注"
                  name="reason"
                  rules={[{ required: true, message: "请填写具体事由" }]}
                >
                  <TextArea rows={6} placeholder="请详细描述您的申请原因..." />
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large" 
                    block 
                    loading={loading}
                    disabled={!selectedFlowId}
                  >
                    🚀 立即提交申请
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>

          {/* 右侧：动态预览区 */}
          <div style={{ width: 340 }}>
            <Card title="审批流预览" bordered={false}>
              {selectedFlowId ? (
                <div>
                   <div style={{ marginBottom: 16 }}>
                     <Text type="secondary">即将发起的流程：</Text>
                     <br/>
                     <Text strong style={{ fontSize: 16 }}>{selectedFlow?.name}</Text>
                   </div>
                   <Steps
                    direction="vertical"
                    size="small"
                    current={0}
                    items={previewSteps}
                  />
                </div>
              ) : (
                <Empty description="请先在左侧选择流程" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default ApplyPage;