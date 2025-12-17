import React from "react";
import { Button, message, Typography, Space, Popconfirm, Select } from "antd";
import { SaveOutlined, FileAddOutlined } from "@ant-design/icons";
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
  
  // 获取获取蓝图的方法，用于校验
  const getProcessDefinition = useFlowStore((s) => s.getProcessDefinition);

  const handlePublish = () => {
    const definition = getProcessDefinition();

    // 1. 基础非空校验
    if (definition.nodes.length === 0) {
      message.warning("画布为空，无法发布");
      return;
    }

    // 2. 🆕 核心逻辑校验：必须有 Start 和 End
    const hasStart = definition.nodes.some((node) => node.type === "start");
    const hasEnd = definition.nodes.some((node) => node.type === "end");

    if (!hasStart) {
      message.error("❌ 发布失败：流程必须包含一个【开始节点】");
      return;
    }

    if (!hasEnd) {
      message.error("❌ 发布失败：流程必须包含一个【结束节点】");
      return;
    }

    // 3. 校验通过，执行发布
    publishFlow();
    message.success("✅ 模板发布成功！可前往发起页查看。");
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
            dropdownMatchSelectWidth={false}
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

          {/* 2. 新建流程 */}
          <Popconfirm 
            title="确定新建吗？" 
            description="如果当前流程未发布，修改将会丢失。"
            onConfirm={handleCreateNew}
            okText="确定新建"
            cancelText="取消"
          >
            <Button icon={<FileAddOutlined />}>新建</Button>
          </Popconfirm>

          {/* 3. 发布按钮 (主要操作) */}
          <Button 
            type="primary" 
            size="large" 
            icon={<SaveOutlined />} 
            onClick={handlePublish}
          >
            发布 / 保存
          </Button>
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