import React from "react";
import { Typography } from "antd";
import { useFlowStore } from "../../../store/flowStore";
import NodeItem from "./NodeItem";

const { Title, Text } = Typography;

const Canvas: React.FC = () => {
  const nodes = useFlowStore((s) => s.nodes);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* 画布标题 */}
      <div style={{ marginBottom: 8 }}>
        <Title level={4} style={{ margin: 0 }}>
          流程设计画布
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          从左侧拖拽节点到画布区域即可创建节点
        </Text>
      </div>

      {/* 画布区域 */}
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
        onMouseDown={() => setSelectedNodeId(null)}
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
        {nodes.map((node) => (
          <NodeItem key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
