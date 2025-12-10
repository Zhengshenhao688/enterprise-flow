import React from "react";
import { Card, Typography, Space } from "antd";
import { useFlowStore } from "../../store/flowStore";
import PropertiesPanel from "./components/PropertiesPanel";
import NodeItem from "./components/NodeItem";
import EdgesLayer from "./components/EdgesLayer";

const { Title, Text } = Typography;

const NODE_TYPES = [
  {
    type: "start",
    label: "开始节点",
    description: "流程起点",
  },
  {
    type: "approval",
    label: "审批节点",
    description: "常规审批、人事/财务审批等",
  },
  {
    type: "end",
    label: "结束节点",
    description: "流程结束节点",
  },
];

const DesignerPage: React.FC = () => {
  const nodes = useFlowStore((s) => s.nodes);
  const addNode = useFlowStore((s) => s.addNode);
  const updateDraft = useFlowStore((s) => s.updateDraft);
  const endConnect = useFlowStore((s) => s.endConnect);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        minHeight: "60vh",
      }}
    >
      {/* 左侧节点面板 */}
      <div style={{ width: 240 }}>
        <Card title="节点面板" bordered={false} style={{ height: "100%" }}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {NODE_TYPES.map((node) => (
              <Card
                key={node.type}
                size="small"
                hoverable
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("node-type", node.type);
                }}
                style={{ cursor: "grab" }}
              >
                <Title level={5} style={{ marginBottom: 4 }}>
                  {node.label}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {node.description}
                </Text>
              </Card>
            ))}
          </Space>
        </Card>
      </div>

      {/* 右侧画布 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minWidth: 500,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 8 }}>
            <Title level={4} style={{ margin: 0 }}>
              流程设计画布
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              从左侧拖拽节点到画布区域即可创建节点
            </Text>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const type = e.dataTransfer.getData("node-type");
              if (!type) return;

              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              addNode({
                id: Date.now().toString(),
                type,
                name:
                  type === "start"
                    ? "开始节点"
                    : type === "approval"
                    ? "审批节点"
                    : "结束节点",
                position: { x, y },
              });
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              updateDraft(e.clientX - rect.left, e.clientY - rect.top);
            }}
            onClick={() => setSelectedNodeId(null)}
            onMouseUp={() => endConnect(null, null)}
            style={{
              flex: 1,
              borderRadius: 8,
              border: "1px dashed #d9d9d9",
              background:
                "repeating-linear-gradient(0deg, #fafafa, #fafafa 24px, #f5f5f5 24px, #f5f5f5 25px)",
              position: "relative",
              minHeight: 400,
            }}
          >
            <EdgesLayer />
            {/* 渲染画布节点 */}
            {nodes.map((node) => (
              <NodeItem key={node.id} node={node} />
            ))}
          </div>
        </div>

        {/* 属性面板 */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            marginLeft: 16,
            minWidth: 240,
          }}
        >
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
};

export default DesignerPage;