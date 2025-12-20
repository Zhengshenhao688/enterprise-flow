import React from "react";
import { Button, message, Typography, Space, Select } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import PropertiesPanel from "./components/PropertiesPanel";
import NodePanel from "./components/NodePanel";
import Canvas from "./components/Canvas";
import { useFlowStore } from "../../store/flowStore";

const { Title } = Typography;

const DesignerPage: React.FC = () => {
  const publishFlow = useFlowStore((s) => s.publishFlow);
  const resetFlow = useFlowStore((s) => s.resetFlow);
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const publishedFlows = useFlowStore((s) => s.publishedFlows);
  
  // 🆕 获取校验方法
  const validateFlow = useFlowStore((s) => s.validateFlow);

  // 🆕 新增 hooks
  const editingMode = useFlowStore((s) => s.editingMode);
  const processId = useFlowStore((s) => s.processId);
  //const processName = useFlowStore((s) => s.processName);
  const duplicatePublishedAsDraft = useFlowStore((s) => s.duplicatePublishedAsDraft);

  // 🆕 派生当前流程版本信息
  const currentPublished = publishedFlows.find(f => f.id === processId);

  const currentVersionLabel =
    currentPublished && currentPublished.version
      ? `v${currentPublished.version}`
      : null;

  const handlePublish = () => {
    // 1. 执行图逻辑校验 (BFS + 规则检查)
    const result = validateFlow();

    // 2. 如果校验失败，弹出错误并终止发布
    if (!result.success) {
      message.error(result.error);
      return;
    }

    // 3. 校验通过，执行发布
    publishFlow();
    message.success("校验通过，模板已成功发布！");
  };

  const handleCreateNew = () => {
    resetFlow();
    message.success("已创建新画布");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 16, background: "#f0f2f5" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>EnterpriseFlow · 设计器</Title>
        
        <Space>
          {/* 1. 切换/加载流程 */}
          <Select 
            placeholder="📂 打开已发布流程..."
            style={{ width: 220 }}
            popupMatchSelectWidth={false}
            onChange={(id) => {
              const target = publishedFlows.find(f => f.id === id);
              if (target) {
                loadFlow(target);
                message.success(`已加载流程: ${target.name}`);
              }
            }}
          >
             {publishedFlows.map(f => (
               <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>
             ))}
          </Select>

          <Button onClick={handleCreateNew}>
            新建流程
          </Button>

          {/* ========== 流程状态提示 ========== */}
          {editingMode === "readonly" && currentVersionLabel && (
            <Typography.Text type="secondary">
              已发布版本 {currentVersionLabel}（只读）
            </Typography.Text>
          )}

          {editingMode === "draft" && (
            <Typography.Text type="warning">
              草稿
            </Typography.Text>
          )}

          {/* ========== 只读模式操作 ========== */}
          {editingMode === "readonly" && (
            <Button
              type="primary"
              onClick={() => {
                if (!processId) return;
                duplicatePublishedAsDraft(processId);
                message.success("已基于当前版本创建草稿，可继续编辑");
              }}
            >
              基于此版本创建草稿
            </Button>
          )}

          {/* ========== 草稿模式操作 ========== */}
          {editingMode === "draft" && (
            <>
              {/* 发布按钮 */}
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                onClick={handlePublish}
              >
                发布为新版本
              </Button>
            </>
          )}
        </Space>
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* 左侧：节点面板 */}
        <NodePanel />
        
        {/* 中间：画布 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Canvas />
        </div>
        
        {/* 右侧：属性面板 */}
        <div style={{ width: 260 }}>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
};

export default DesignerPage;