import React, { useEffect, useRef, useState } from "react";
import { Typography } from "antd";
import { useFlowStore } from "../../../store/flowStore";
import NodeItem from "./NodeItem";
import EdgesLayer from "./EdgesLayer";

const { Title, Text } = Typography;

type Point = { x: number; y: number };

const Canvas: React.FC = () => {
  const nodes = useFlowStore((s) => s.nodes);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const setCanvasSize = useFlowStore((s) => s.setCanvasSize);

  // ✅ viewport 统一来自 store
  const viewportOffset = useFlowStore((s) => s.viewportOffset);
  const setViewportOffset = useFlowStore((s) => s.setViewportOffset);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ===== Pan refs =====
  const isSpaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const panStartOffsetRef = useRef<Point>({ x: 0, y: 0 });

  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // ================== 画布尺寸同步 ==================
  useEffect(() => {
    if (!canvasRef.current) return;

    const el = canvasRef.current;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);

    return () => ro.disconnect();
  }, [setCanvasSize]);

  // ================== 空格键监听 ==================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDownRef.current = true;
        setIsSpaceDown(true);
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDownRef.current = false;
        setIsSpaceDown(false);
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ================== Pan 移动 ==================
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;

      setViewportOffset({
        x:
          panStartOffsetRef.current.x +
          (e.clientX - panStartMouseRef.current.x),
        y:
          panStartOffsetRef.current.y +
          (e.clientY - panStartMouseRef.current.y),
      });
    };

    const onMouseUp = () => {
      isPanningRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [setViewportOffset]);

  const tryStartPan = (e: React.MouseEvent<HTMLDivElement>) => {
    const isMiddle = e.button === 1;
    const isSpaceLeft = isSpaceDownRef.current && e.button === 0;
    if (!isMiddle && !isSpaceLeft) return false;

    isPanningRef.current = true;
    panStartMouseRef.current = { x: e.clientX, y: e.clientY };
    panStartOffsetRef.current = { ...viewportOffset };

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    e.preventDefault();
    return true;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 8 }}>
        <Title level={4} style={{ margin: 0 }}>
          流程设计画布
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          空格 / 中键拖动画布，点击锚点连线
        </Text>
      </div>

      <div
        ref={canvasRef}
        data-canvas-root
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const type = e.dataTransfer.getData("node-type");
          if (!type) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left - viewportOffset.x;
          const y = e.clientY - rect.top - viewportOffset.y;

          addNode({
            id: Date.now().toString(),
            type,
            name: type,
            position: { x, y },
          });
        }}
        onMouseDown={(e) => {
          if (tryStartPan(e)) return;
          setSelectedNodeId(null);
        }}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          border: "1px dashed #d9d9d9",
          cursor: isSpaceDown ? "grab" : "default",
        }}
      >
        {/* ===== 线层：屏幕坐标（不跟随 transform） ===== */}
        <EdgesLayer />

        {/* ===== 世界层：节点才跟随 Pan ===== */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px)`,
            transformOrigin: "0 0",
          }}
        >
          {nodes.map((node) => (
            <NodeItem key={node.id} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Canvas;