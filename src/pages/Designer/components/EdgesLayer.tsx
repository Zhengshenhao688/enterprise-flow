import React, { useMemo } from "react";
// ⭐ 修复：使用 type 关键字导入 FlowNode，解决 TS1484
import { useFlowStore, getAnchorCoordinate, type FlowNode } from "../../../store/flowStore";

const EdgesLayer: React.FC = () => {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);

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
        overflow: "visible",
      }}
    >
      {edges.map((edge) => {
        const fromNode = nodeMap[edge.from.nodeId];
        const toNode = nodeMap[edge.to.nodeId];

        if (!fromNode || !toNode) return null;

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