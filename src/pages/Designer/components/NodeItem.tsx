import React from "react";
import { message } from "antd"; // 引入 message 用于交互提示
import { useFlowStore, NODE_WIDTH, NODE_HEIGHT } from "../../../store/flowStore";
import type { FlowNode, AnchorType } from "../../../store/flowStore";
import "./nodeItem.css";

type NodeItemProps = {
  node: FlowNode;
};

// 定义所有锚点
const allAnchors: AnchorType[] = ["top", "right", "bottom", "left"];

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

  // 1. 根据节点类型，决定显示哪些锚点
  const getVisibleAnchors = () => {
    switch (node.type) {
      case "start":
        // 开始节点：只出不进 -> 只显示 右、下
        return ["right", "bottom"];
      case "end":
        // 结束节点：只进不出 -> 只显示 左、上
        return ["top", "left"];
      default:
        // 审批节点：有进有出 -> 显示全部
        return allAnchors;
    }
  };

  const visibleAnchors = getVisibleAnchors();

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

    // 2. 交互方向约束：左/上只能进(Target)，右/下只能出(Source)
    const isOutputAnchor = anchor === "right" || anchor === "bottom";
    const isInputAnchor = anchor === "top" || anchor === "left";

    if (connectState.mode === "idle") {
      // 准备开始连线：必须从 Output 锚点开始
      if (isOutputAnchor) {
        startConnect(node.id, anchor);
      } else {
        message.warning("请从 [右] 或 [下] 锚点开始连线");
      }
    } else {
      // 准备结束连线：必须连到 Input 锚点
      if (isInputAnchor) {
        finishConnect(node.id, anchor);
      } else {
        message.warning("请连接到 [左] 或 [上] 锚点");
      }
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
      <div className="ef-node-label" title={node.name}>
        {node.name}
      </div>

      {/* 只渲染允许显示的锚点 */}
      {visibleAnchors.map((anchor) => (
        <div
          key={anchor}
          className={`ef-anchor ${anchor}`}
          // 只有在这里处理连线逻辑
          onMouseDown={(e) => handleAnchorMouseDown(e, anchor as AnchorType)}
        />
      ))}
    </div>
  );
};

export default NodeItem;