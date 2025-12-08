import React from "react";
import { Card, Typography, Space } from "antd";
import { useFlowStore } from "../../store/useFlowStore";

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
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        minHeight: "60vh",
      }}
    >
      {/* 左侧：节点面板 */}
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

      {/* 右侧：流程画布区域 */}
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
              x,
              y,
            });
          }}
          onClick={() => setSelectedNode(null)}
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
          {/* 渲染画布里的节点 */}
          {nodes.map((node) => (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node.id);
              }}
              style={{
                position: "absolute",
                top: node.y,
                left: node.x,
                padding: "6px 12px",
                borderRadius: 6,
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                border:
                  selectedNodeId === node.id
                    ? "2px solid #1677ff"
                    : "1px solid #d9d9d9",
                transform: "translate(-50%, -50%)",
                fontSize: 14,
              }}
            >
              {node.type === "start" && "开始"}
              {node.type === "approval" && "审批"}
              {node.type === "end" && "结束"}
            </div>
          ))}
        </div>
        {selectedNodeId && (
          <Card title="节点属性" style={{ marginTop: 16 }}>
            <p>节点ID：{selectedNodeId}</p>
            <p>
              类型：
              {nodes.find((n) => n.id === selectedNodeId)?.type === "start"
                ? "开始节点"
                : nodes.find((n) => n.id === selectedNodeId)?.type ===
                  "approval"
                ? "审批节点"
                : "结束节点"}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DesignerPage;
