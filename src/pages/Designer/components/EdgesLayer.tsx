import React from "react";
import { anchorOffsets, useFlowStore } from "../../../store/flowStore";
import type { AnchorType } from "../../../store/flowStore";


export default function EdgesLayer() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const connectionDraft = useFlowStore((s) => s.connectionDraft);

  // 获取锚点的绝对坐标
  const getAnchorPos = (nodeId: string, anchor: AnchorType) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const offset = anchorOffsets[anchor];
    return {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    };
  };

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {/* 已有连线 */}
      {edges.map((edge) => {
        const p1 = getAnchorPos(edge.from.nodeId, edge.from.anchor);
        const p2 = getAnchorPos(edge.to.nodeId, edge.to.anchor);

        return (
          <line
            key={edge.id}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="#555"
            strokeWidth={2}
          />
        );
      })}

      {/* 正在连线的虚线 */}
      {connectionDraft && (
        <line
          x1={getAnchorPos(
            connectionDraft.fromNodeId,
            connectionDraft.fromAnchor
          ).x}
          y1={getAnchorPos(
            connectionDraft.fromNodeId,
            connectionDraft.fromAnchor
          ).y}
          x2={connectionDraft.mouseX}
          y2={connectionDraft.mouseY}
          stroke="#999"
          strokeWidth={2}
          strokeDasharray="6,4"
        />
      )}
    </svg>
  );
}
