import React, { useEffect, useRef, useState } from "react";
import { Typography } from "antd";
import { useFlowStore } from "../../../store/flowStore";
import NodeItem from "./NodeItem";
import EdgesLayer from "./EdgesLayer";

const { Title, Text } = Typography;

type Point = { x: number; y: number };

const NODE_NAME_MAP: Record<string, string> = {
  start: "发起人",
  approval: "审批人",
  end: "结束",
};

const Canvas: React.FC = () => {
  const nodes = useFlowStore((s) => s.nodes);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useFlowStore((s) => s.setSelectedEdgeId);
  const setCanvasSize = useFlowStore((s) => s.setCanvasSize);
  const viewportOffset = useFlowStore((s) => s.viewportOffset);
  const setViewportOffset = useFlowStore((s) => s.setViewportOffset);
  const deleteSelected = useFlowStore((s) => s.deleteSelected);
  
  // 🆕 连线相关 Hook
  const updateConnectCursor = useFlowStore((s) => s.updateConnectCursor);
  const cancelConnect = useFlowStore((s) => s.cancelConnect); // 获取取消方法
  const connectState = useFlowStore((s) => s.connectState);

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
      
      // Delete 删除
      if (!isInput && (e.key === "Delete" || e.key === "Backspace")) {
        deleteSelected();
      }

      // 🆕 ESC 取消连线
      if (e.key === "Escape") {
        if (connectState.mode === "connecting") {
          cancelConnect();
        }
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }

      // Space 拖拽模式
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
  }, [deleteSelected, connectState.mode, cancelConnect]); // 依赖项更新

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        setViewportOffset({
          x: panStartOffsetRef.current.x + (e.clientX - panStartMouseRef.current.x),
          y: panStartOffsetRef.current.y + (e.clientY - panStartMouseRef.current.y),
        });
        return;
      }

      // 更新连线光标位置
      if (connectState.mode === "connecting" && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - viewportOffset.x;
        const y = e.clientY - rect.top - viewportOffset.y;
        updateConnectCursor({ x, y });
      }
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
  }, [setViewportOffset, viewportOffset, connectState.mode]);

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
          空格+左键 / 中键拖动画布，选中按 Delete 删除，右键/ESC 取消连线
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
          const defaultName = NODE_NAME_MAP[type] || type;

          addNode({
            id: Date.now().toString(),
            type,
            name: defaultName, 
            position: { x, y },
          });
        }}
        // 🆕 支持右键点击取消连线
        onContextMenu={(e) => {
           e.preventDefault();
           if (connectState.mode === "connecting") {
             cancelConnect();
           }
        }}
        onMouseDown={(e) => {
          if (tryStartPan(e)) return;
          
          // 🆕 核心逻辑：如果正在连线，点击空白处 = 取消
          if (connectState.mode === "connecting") {
             cancelConnect();
             return;
          }

          setSelectedNodeId(null);
          setSelectedEdgeId(null);
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
          {/* 1️⃣ 底层：渲染已完成的连线 (在节点下方) */}
          <EdgesLayer layer="bottom" />
          
          {/* 2️⃣ 中层：渲染节点 */}
          <div style={{ pointerEvents: "auto", width: "100%", height: "100%" }}>
            {nodes.map((node) => (
              <NodeItem key={node.id} node={node} />
            ))}
          </div>

          {/* 3️⃣ 顶层：渲染正在拖拽的橡皮筋虚线 (在节点上方，防止遮挡) */}
          <EdgesLayer layer="top" />
        </div>
      </div>
    </div>
  );
};

export default Canvas;