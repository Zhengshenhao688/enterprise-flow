import React from "react";
// ⭐ 修复：引入 Store 中的常量，用于强制设置 style
import { useFlowStore, NODE_WIDTH, NODE_HEIGHT } from "../../../store/flowStore";
// ⭐ 修复：使用 type 导入，解决 TS 1484/2322 错误
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

  const shouldShowAnchors = isSelected || connectState.mode === "connecting";

  return (
    <div
      className={`ef-node ${isSelected ? "is-selected" : ""} ${
        isConnecting ? "is-connecting" : ""
      }`}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        // ⭐ 核心修复：强制 DOM 尺寸等于逻辑尺寸，防止 CSS padding 撑大导致连线错位
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        // 辅助样式：确保文字居中
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box" 
      }}
      onMouseDown={(e) => {
        e.stopPropagation();

        if (connectState.mode === "connecting") return;

        setSelectedNodeId(node.id);

        const startX = e.clientX;
        const startY = e.clientY;
        const startPos = { ...node.position };

        const onMouseMove = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          updateNodePosition(node.id, {
            x: startPos.x + dx,
            y: startPos.y + dy,
          });
        };

        const onMouseUp = () => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      }}
    >
      <div className="ef-node__content">{node.name}</div>

      {shouldShowAnchors &&
        anchors.map((anchor) => (
          <span
            key={anchor}
            className={`ef-anchor ${anchor} ${
              shouldShowAnchors ? "visible" : "hidden"
            }`}
            data-anchor={anchor}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();

              if (connectState.mode === "idle") {
                startConnect(node.id, anchor);
              } else {
                finishConnect(node.id, anchor);
              }
            }}
          />
        ))}
    </div>
  );
};

export default NodeItem;