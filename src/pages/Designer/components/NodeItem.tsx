// NodeItem.tsx
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
  const updateNodePosition = useFlowStore((s) => s.updateNodePosition);

  // ===== 连线相关 =====
  const connectState = useFlowStore((s) => s.connectState);
  const startConnect = useFlowStore((s) => s.startConnect);
  const finishConnect = useFlowStore((s) => s.finishConnect);

  const isSelected = selectedNodeId === node.id;
  const isConnecting =
    connectState.mode === "connecting" && connectState.fromNodeId === node.id;

  // 连线中：显示所有锚点以便连接
  // 非连线中：仅选中节点显示锚点
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
      }}
      onMouseDown={(e) => {
        e.stopPropagation();

        // 连线模式下，点击节点不应打断连线，也不应触发拖拽
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
      {/* 节点主体 */}
      <div className="ef-node__content">{node.name}</div>

      {/* ===== 锚点 ===== */}
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
                // 第一次点击：开始连线
                startConnect(node.id, anchor);
              } else {
                // 第二次点击：完成连线
                finishConnect(node.id, anchor);
              }
            }}
          />
        ))}
    </div>
  );
};

export default NodeItem;