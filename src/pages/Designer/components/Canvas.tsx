import React, { useEffect, useRef, useState } from "react";
import { Typography } from "antd";
import { useFlowStore } from "../../../store/flowStore";
import NodeItem from "./NodeItem";
import EdgesLayer from "./EdgesLayer";

const { Title, Text } = Typography;

type Point = { x: number; y: number };

// ⭐ 新增：定义主流平台的默认节点名称映射
const NODE_NAME_MAP: Record<string, string> = {
  start: "发起人",
  approval: "审批人",
  end: "结束",
  // 如果未来有抄送节点，可以加: cc: "抄送人"
};

const Canvas: React.FC = () => {
  const nodes = useFlowStore((s) => s.nodes);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const setCanvasSize = useFlowStore((s) => s.setCanvasSize);
  const viewportOffset = useFlowStore((s) => s.viewportOffset);
  const setViewportOffset = useFlowStore((s) => s.setViewportOffset);
  const deleteSelected = useFlowStore((s) => s.deleteSelected);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isSpaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const panStartOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (!isInput && (e.key === "Delete" || e.key === "Backspace")) {
        deleteSelected();
      }

      if (e.code === "Space") {
        if (!isSpaceDownRef.current) {
          isSpaceDownRef.current = true;
          setIsSpaceDown(true);
        }
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
  }, [deleteSelected]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      setViewportOffset({
        x: panStartOffsetRef.current.x + (e.clientX - panStartMouseRef.current.x),
        y: panStartOffsetRef.current.y + (e.clientY - panStartMouseRef.current.y),
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ marginBottom: 12, paddingLeft: 4 }}>
        <Title level={4} style={{ margin: 0 }}>
          流程设计画布
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          空格+左键 / 中键拖动画布，选中节点按 Delete 删除
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
          
          // ⭐ 核心修改：使用映射表来设置默认名称
          // 如果映射表中没有，就降级使用 type 原名
          const defaultName = NODE_NAME_MAP[type] || type;

          addNode({
            id: Date.now().toString(),
            type,
            name: defaultName, // 这里不再是 name: type
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
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #f0f0f0",
          backgroundImage: "radial-gradient(#d9d9d9 1.5px, transparent 1.5px)",
          backgroundSize: "20px 20px",
          backgroundPosition: `${viewportOffset.x}px ${viewportOffset.y}px`,
          cursor: isSpaceDown ? "grab" : "default",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px)`,
            transformOrigin: "0 0",
            pointerEvents: "none",
          }}
        >
          <EdgesLayer />
          <div style={{ pointerEvents: "auto", width: "100%", height: "100%" }}>
            {nodes.map((node) => (
              <NodeItem key={node.id} node={node} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Canvas;