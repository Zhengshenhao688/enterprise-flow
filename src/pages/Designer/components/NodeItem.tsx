import React from "react";
import { useFlowStore, NODE_WIDTH, NODE_HEIGHT } from "../../../store/flowStore";
import type { FlowNode, AnchorType } from "../../../store/flowStore";
import "./nodeItem.css";

type NodeItemProps = {
  node: FlowNode;
};

const anchors: AnchorType[] = ["top", "right", "bottom", "left"];

const NodeItem: React.FC<NodeItemProps> = ({ node }) => {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const updateNodePosition = useFlowStore((s) => s.updateNodePosition);
  
  const connectState = useFlowStore((s) => s.connectState);
  const startConnect = useFlowStore((s) => s.startConnect);
  const finishConnect = useFlowStore((s) => s.finishConnect);

  const isSelected = selectedNodeId === node.id;
  const isConnecting = 
    connectState.mode === "connecting" && connectState.fromNodeId === node.id;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (connectState.mode === "connecting") return;

    setSelectedNodeId(node.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startNodePos = { ...node.position };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      updateNodePosition(node.id, {
        x: startNodePos.x + dx,
        y: startNodePos.y + dy,
      });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleAnchorMouseDown = (e: React.MouseEvent, anchor: AnchorType) => {
    e.stopPropagation();
    e.preventDefault();
    if (connectState.mode === "idle") {
      startConnect(node.id, anchor);
    } else {
      finishConnect(node.id, anchor);
    }
  };

  return (
    <div
      className={`ef-node ${isSelected ? "is-selected" : ""} ${isConnecting ? "is-connecting" : ""}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 纯文字显示，居中 */}
      <div className="ef-node-label" title={node.name}>
        {node.name}
      </div>

      {anchors.map((anchor) => (
        <div
          key={anchor}
          className={`ef-anchor ${anchor}`}
          onMouseDown={(e) => handleAnchorMouseDown(e, anchor)}
        />
      ))}
    </div>
  );
};

export default NodeItem;