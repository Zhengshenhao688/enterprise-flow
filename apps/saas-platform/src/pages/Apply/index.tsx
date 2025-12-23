import React from "react";
import { Layout, Typography } from "antd";

import { useApply } from "./useApply";
import ApplyForm from "./components/ApplyForm";
import FlowPreview from "./components/ApprovalPreview";

const { Title, Paragraph } = Typography;
const { Content } = Layout;

/**
 * ApplyPage
 * - 页面级容器
 * - 只负责 layout + 组件编排
 * - ❌ 不包含任何业务逻辑
 */
const ApplyPage: React.FC = () => {
  const {
    form,
    publishedFlows,

    selectedFlowId,
    setSelectedFlowId,

    selectedFlow,
    previewSteps,
    needAmountInput,
  } = useApply();

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          padding: "0 24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            height: 64,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            EnterpriseFlow · 员工服务台
          </Title>
        </div>
      </div>

      <Content
        style={{
          maxWidth: 1200,
          margin: "24px auto",
          width: "100%",
          padding: "0 24px",
        }}
      >
        {/* 页面说明 */}
        <div style={{ marginBottom: 24 }}>
          <Paragraph type="secondary">
            请选择业务类型并填写详情，系统将自动匹配审批流。
          </Paragraph>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* 左侧：申请表单 */}
          <div style={{ flex: 1 }}>
            <ApplyForm
              publishedFlows={publishedFlows}
              selectedFlowId={selectedFlowId}
              needAmountInput={needAmountInput}
              onSelectFlow={setSelectedFlowId}
              form={form}
              onSubmitSuccess={() => {
                /* 跳转已在 ApplyForm 内处理，这里不关心 */
              }}
            />
          </div>

          {/* 右侧：审批流预览 */}
          <div style={{ width: 340 }}>
            <FlowPreview
              flowName={selectedFlow?.name}
              previewSteps={previewSteps}
            />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default ApplyPage;