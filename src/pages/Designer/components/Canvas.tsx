import React, { useEffect, useRef, useState } from "react";
import { Typography } from "antd";
import { useFlowStore } from "../../../store/flowStore";
import NodeItem from "./NodeItem";

const { Title, Text } = Typography;

type Point = { x: number; y: number };

const Canvas: React.FC = () => {
  const nodes = useFlowStore((s) => s.nodes);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const setCanvasSize = useFlowStore((s) => s.setCanvasSize);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ===== Pan：viewport 偏移（只存在 Canvas，不进 store）=====
  const [viewportOffset, setViewportOffset] = useState<Point>({ x: 0, y: 0 });

  // 是否按住空格（用 ref 避免频繁 re-render）
  const isSpaceDownRef = useRef(false);

  // 是否正在平移
  const isPanningRef = useRef(false);

  // 开始平移时的鼠标点 & 起始 offset
  const panStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const panStartOffsetRef = useRef<Point>({ x: 0, y: 0 });

  // 是否按住空格
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // ================== 画布尺寸同步 ==================
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

    updateSize();
    requestAnimationFrame(updateSize);

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

  // ================== 空格键监听（全局） ==================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 只认 Space（避免输入框里也触发滚动等）
      if (e.code === "Space") {
        isSpaceDownRef.current = true;
        setIsSpaceDown(true);
        // 阻止空格滚动页面（有些页面会滚）
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

  // ================== Pan：鼠标移动/抬起（全局） ==================
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;

      const dx = e.clientX - panStartMouseRef.current.x;
      const dy = e.clientY - panStartMouseRef.current.y;

      setViewportOffset({
        x: panStartOffsetRef.current.x + dx,
        y: panStartOffsetRef.current.y + dy,
      });
    };

    const onMouseUp = () => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;

      // 结束后恢复光标/选择
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ================== 开始平移（画布上按下） ==================
  const tryStartPan = (e: React.MouseEvent<HTMLDivElement>) => {
    // 中键 或 空格+左键
    const isMiddleMouse = e.button === 1;
    const isSpaceLeftMouse = isSpaceDownRef.current && e.button === 0;

    if (!isMiddleMouse && !isSpaceLeftMouse) return false;

    // 开始平移：记录起点
    isPanningRef.current = true;
    panStartMouseRef.current = { x: e.clientX, y: e.clientY };
    panStartOffsetRef.current = { ...viewportOffset };

    // 交互体验：抓手 + 禁止选中文字
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    // 防止中键滚动/自动滚动等默认行为
    e.preventDefault();

    return true;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* 画布标题 */}
      <div style={{ marginBottom: 8 }}>
        <Title level={4} style={{ margin: 0 }}>
          流程设计画布
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          从左侧拖拽节点到画布区域即可创建节点（空格+左键 / 中键 可拖动画布）
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

          // screen -> world：要减去 viewportOffset（关键）
          const x = e.clientX - rect.left - viewportOffset.x;
          const y = e.clientY - rect.top - viewportOffset.y;

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
        onMouseDown={(e) => {
          // 先尝试开始平移
          const started = tryStartPan(e);
          if (started) return;

          // 非平移：点击空白取消选中
          setSelectedNodeId(null);
        }}
        style={{
          flex: 1,
          borderRadius: 8,
          border: "1px dashed #d9d9d9",
          background:
            "repeating-linear-gradient(0deg, #fafafa, #fafafa 24px, #f5f5f5 24px, #f5f5f5 25px)",
          position: "relative",
          minHeight: 400,
          overflow: "hidden",
          // 空格按下时提示可拖
          cursor: isSpaceDown ? "grab" : "default",
        }}
      >
        {/* WorldLayer：只移动这一层（不动节点 worldPosition） */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
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