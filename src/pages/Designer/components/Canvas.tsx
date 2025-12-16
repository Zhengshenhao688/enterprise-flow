import React, { useEffect, useRef } from "react";
import { Typography } from "antd";
import { useFlowStore } from "../../../store/flowStore";
import NodeItem from "./NodeItem";

const { Title, Text } = Typography;

const Canvas: React.FC = () => {
  const nodes = useFlowStore((s) => s.nodes);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const setCanvasSize = useFlowStore((s) => s.setCanvasSize);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const el = canvasRef.current;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setCanvasSize({
        width: rect.width,
        height: rect.height,
      });
    };

    // 初次同步：立即一次 + 下一帧再来一次，避免首次布局尚未稳定导致高度偏小
    updateSize();
    requestAnimationFrame(updateSize);

    // 监听画布尺寸变化（更稳：窗口变化/侧栏折叠/布局变化都会触发）
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateSize());
      ro.observe(el);
    } else {
      window.addEventListener("resize", updateSize);
    }

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [setCanvasSize]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* 画布标题 */}
      <div style={{ marginBottom: 8 }}>
        <Title level={4} style={{ margin: 0 }}>
          流程设计画布
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          从左侧拖拽节点到画布区域即可创建节点
        </Text>
      </div>

      {/* 画布区域 */}
      <div
        ref={canvasRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const type = e.dataTransfer.getData("node-type");
          if (!type) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          addNode({
            id: Date.now().toString(),
            type,
            name:
              type === "start"
                ? "开始节点"
                : type === "approval"
                ? "审批节点"
                : "结束节点",
            position: { x, y },
          });
        }}
        onMouseDown={() => setSelectedNodeId(null)}
        style={{
          flex: 1,
          borderRadius: 8,
          border: "1px dashed #d9d9d9",
          background:
            "repeating-linear-gradient(0deg, #fafafa, #fafafa 24px, #f5f5f5 24px, #f5f5f5 25px)",
          position: "relative",
          minHeight: 400,
          overflow: "hidden",
        }}
      >
        {nodes.map((node) => (
          <NodeItem key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
