import React, { useLayoutEffect, useRef } from "react";
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

  // ⭐ 真实锚点坐标上报
  const setAnchorPosition = useFlowStore((s) => s.setAnchorPosition);
  

  const isSelected = selectedNodeId === node.id;
  const isConnecting =
    connectState.mode === "connecting" && connectState.fromNodeId === node.id;

  // 连线中：所有节点显示锚点
  // 非连线中：仅选中节点显示锚点
  const shouldShowAnchors = isSelected || connectState.mode === "connecting";

  // ===== 锚点 refs（DOM 真实位置来源）=====
  const anchorRefs = useRef<Record<AnchorType, HTMLSpanElement | null>>({
    top: null,
    right: null,
    bottom: null,
    left: null,
  });

  // ===== 上报真实锚点中心坐标 =====
  useLayoutEffect(() => {
    Object.entries(anchorRefs.current).forEach(([anchor, el]) => {
      if (!el) return;

      const rect = el.getBoundingClientRect();

      setAnchorPosition(node.id, anchor as AnchorType, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    });
  });

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
        setSelectedNodeId(node.id);

        // 连线中禁止拖拽节点
        if (connectState.mode === "connecting") return;

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
            ref={(el) => {
              anchorRefs.current[anchor] = el;
            }}
            className={`ef-anchor ${anchor}  ${
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
