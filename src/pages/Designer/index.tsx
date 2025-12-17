import React from "react";
import { Button, message, Typography, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { RocketOutlined, SaveOutlined } from "@ant-design/icons"; // 引入图标
import PropertiesPanel from "./components/PropertiesPanel";
import NodePanel from "./components/NodePanel";
import Canvas from "./components/Canvas";
import { useFlowStore } from "../../store/flowStore";
import { useProcessInstanceStore } from "../../store/processInstanceStore";

const { Title } = Typography;

const DesignerPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 1. 获取 Store 方法
  const getProcessDefinition = useFlowStore((s) => s.getProcessDefinition);
  const publishFlow = useFlowStore((s) => s.publishFlow); // 🆕 获取发布方法
  const startProcess = useProcessInstanceStore((s) => s.startProcess);

  // 🆕 处理发布模板逻辑
  const handlePublish = () => {
    const definition = getProcessDefinition();
    if (definition.nodes.length === 0) {
      message.warning("画布为空，无法发布");
      return;
    }
    
    publishFlow(); // 调用 Store 的发布方法
    message.success("✅ 模板发布成功！现在可以在“发起页”选择此流程了。");
  };

  // 处理直接运行逻辑 (调试用)
  const handleStartProcess = () => {
    const definition = getProcessDefinition();

    if (definition.nodes.length === 0) {
      message.warning("画布为空，无法发起流程");
      return;
    }

    // 直接实例化并跳转，跳过选模板步骤
    startProcess(definition);
    message.success("流程发起成功 (调试模式)！正在跳转至审批中心...");
    navigate("/approval");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 16, background: "#f0f2f5" }}>
      
      {/* 顶部 Header 区域 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>EnterpriseFlow · 设计器</Title>
        
        {/* 核心交互按钮区 */}
        <Space>
          {/* 🆕 发布按钮 */}
          <Button 
            type="dashed" 
            size="large" 
            icon={<SaveOutlined />} 
            onClick={handlePublish}
          >
            💾 发布模板 (Publish)
          </Button>

          {/* 调试按钮 */}
          <Button 
            type="primary" 
            size="large" 
            icon={<RocketOutlined />} 
            onClick={handleStartProcess}
          >
            🚀 直接测试 (Debug)
          </Button>
        </Space>
      </div>

      {/* 下方原有编辑器区域 (保持 Flex Row 布局) */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flex: 1, 
          minHeight: 0, 
        }}
      >
        <NodePanel />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Canvas />
        </div>
        <div style={{ width: 260 }}>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
};

export default DesignerPage;