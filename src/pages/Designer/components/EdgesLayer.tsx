//EdgeLayer.tsx

import React, { useMemo } from "react";
import { useFlowStore, getAnchorCoordinate, type FlowNode } from "../../../store/flowStore";

const EdgesLayer: React.FC = () => {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);

  // 1. 建立 id -> Node 的查找表，便于 O(1) 获取节点位置
  const nodeMap = useMemo(() => {
    return nodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {} as Record<string, FlowNode>);
  }, [nodes]);

  return (
    <svg
      width="100%"
      height="100%"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        overflow: "visible", // 允许线条画在 SVG 视口外（如果父容器允许）
      }}
    >
      {edges.map((edge) => {
        const fromNode = nodeMap[edge.from.nodeId];
        const toNode = nodeMap[edge.to.nodeId];

        // 只有当两个节点都存在时才渲染
        if (!fromNode || !toNode) return null;

        // 2. ⭐ 直接计算世界坐标，无需 DOM 测量
        const start = getAnchorCoordinate(fromNode.position, edge.from.anchor);
        const end = getAnchorCoordinate(toNode.position, edge.to.anchor);

        return (
          <line
            key={edge.id}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#1677ff"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
};

export default EdgesLayer;