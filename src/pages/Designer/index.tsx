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
  const resetFlow = useFlowStore((s) => s.resetFlow); // 🆕 获取重置方法
  const loadFlow = useFlowStore((s) => s.loadFlow);   // 🆕 获取加载方法
  const publishedFlows = useFlowStore((s) => s.publishedFlows); // 🆕 获取已发布列表

  const handlePublish = () => {
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
            // 绑定 Select 的值，如果不绑定，切换后显示还是空的
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