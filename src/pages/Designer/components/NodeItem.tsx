import React from "react";
import { useFlowStore } from "../../../store/flowStore";
import type { FlowNode, AnchorType } from "../../../store/flowStore";
import "./nodeItem.css";

type NodeItemProps = {
  node: FlowNode;
};

const anchors: AnchorType[] = ["top", "right", "bottom", "left"];

const NodeItem: React.FC<NodeItemProps> = ({ node }) => {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);

  const isSelected = selectedNodeId === node.id;

  return (
    <div
      className={`ef-node ${isSelected ? "is-selected" : ""}`}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setSelectedNodeId(node.id);
      }}
    >
      {/* 节点主体 */}
      <div className="ef-node__content">{node.name}</div>

      {/* 选中态锚点 */}
      {isSelected &&
        anchors.map((anchor) => (
          <span
            key={anchor}
            className={`ef-anchor ${anchor}`}
            data-anchor={anchor}
          />
        ))}
    </div>
  );
};

export default NodeItem;