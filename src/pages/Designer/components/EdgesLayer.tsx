import React, { useEffect, useMemo, useState } from "react";
import { useFlowStore } from "../../../store/flowStore";

/**
 * EdgesLayer
 * - 使用真实锚点 DOM 坐标（screen）
 * - 转换为 canvas 本地坐标
 */
const EdgesLayer: React.FC = () => {
  const edges = useFlowStore((s) => s.edges);
  const anchorPositions = useFlowStore((s) => s.anchorPositions);
  const nodes = useFlowStore((s) => s.nodes);

  // 用 state 存 Canvas rect
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

  // nodeId -> node.position 映射（这里只是完整性保留，不参与几何）
  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => {
      map.set(n.id, { x: n.position.x, y: n.position.y });
    });
    return map;
  }, [nodes]);

  // 获取 Canvas rect
  useEffect(() => {
    const el = document.querySelector(
      "[data-canvas-root]"
    ) as HTMLDivElement | null;

    if (!el) return;

    let raf = 0;

    const update = () => {
      raf = requestAnimationFrame(() => {
        setCanvasRect(el.getBoundingClientRect());
      });
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro.disconnect();
    };
  }, []);

  if (!canvasRect) return null;

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
        const fromKey = `${edge.from.nodeId}:${edge.from.anchor}`;
        const toKey = `${edge.to.nodeId}:${edge.to.anchor}`;

        const fromPos = anchorPositions[fromKey];
        const toPos = anchorPositions[toKey];
        const fromNode = nodeMap.get(edge.from.nodeId);
        const toNode = nodeMap.get(edge.to.nodeId);

        if (!fromPos || !toPos || !fromNode || !toNode) return null;

        // ⭐ 核心修复：同步减去 viewportOffset
        const x1 = fromPos.x - canvasRect.left;
        const y1 = fromPos.y - canvasRect.top;
        const x2 = toPos.x - canvasRect.left;
        const y2 = toPos.y - canvasRect.top;

        return (
          <line
            key={edge.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#1677ff"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
};

export default EdgesLayer;