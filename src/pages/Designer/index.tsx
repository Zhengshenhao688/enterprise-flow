import React from "react";
import { Button, message, Typography } from "antd";
import { useNavigate } from "react-router-dom"; // 引入路由跳转
import PropertiesPanel from "./components/PropertiesPanel";
import NodePanel from "./components/NodePanel";
import Canvas from "./components/Canvas";
import { useFlowStore } from "../../store/flowStore";
import { useProcessInstanceStore } from "../../store/processInstanceStore";

const { Title } = Typography;

const DesignerPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 1. 获取 Store 方法
  // getProcessDefinition: 用于提取当前画布上的 "蓝图"
  // startProcess: 用于根据 "蓝图" 实例化一个任务
  const getProcessDefinition = useFlowStore((s) => s.getProcessDefinition);
  const startProcess = useProcessInstanceStore((s) => s.startProcess);

  const handleStartProcess = () => {
    // 2. 获取当前流程定义（快照）
    const definition = getProcessDefinition();

    // 简单的防御性编程
    if (definition.nodes.length === 0) {
      message.warning("画布为空，无法发起流程");
      return;
    }

    // 3. 在实例 Store 中创建新实例
    // 这会将当前的 nodes/edges 复制一份存入 instances 列表
    startProcess(definition);
    
    message.success("流程发起成功！正在跳转至审批中心...");

    // 4. 跳转到审批页面查看结果
    navigate("/approval");
  };

  return (
    // 修改布局为 Flex Column，以便在顶部放置工具栏
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 16, background: "#f0f2f5" }}>
      
      {/* 顶部 Header 区域 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>EnterpriseFlow · 设计器</Title>
        
        {/* 核心交互按钮 */}
        <Button type="primary" size="large" onClick={handleStartProcess}>
          🚀 发起流程 (Run)
        </Button>
      </div>

      {/* 下方原有编辑器区域 (保持 Flex Row 布局) */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flex: 1, // 自动撑满剩余高度
          minHeight: 0, // 防止 flex 子项溢出问题
        }}
      >
        {/* 左侧：节点面板 */}
        <NodePanel />

        {/* 中间：画布区域 */}
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