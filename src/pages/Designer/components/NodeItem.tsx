import { useFlowStore } from "../../../store/flowStore";
import type { AnchorType, FlowNode } from "../../../store/flowStore";

const anchorPositions: Record<AnchorType, { x: number; y: number }> = {
  top: { x: 50, y: 0 },
  right: { x: 100, y: 50 },
  bottom: { x: 50, y: 100 },
  left: { x: 0, y: 50 },
};

export default function NodeItem({ node }: { node: FlowNode }) {
  const startConnect = useFlowStore((s) => s.startConnect);

  return (
    <div
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 100,
        height: 100,
        background: "#fff",
        border: "2px solid #1677ff",
        borderRadius: 8,
        userSelect: "none",
      }}
    >
      {/* 节点文字 */}
      <div style={{ textAlign: "center", marginTop: 35 }}>{node.name}</div>

      {/* 四个锚点 */}
      {(["top", "right", "bottom", "left"] as AnchorType[]).map((anchor) => {
        const pos = anchorPositions[anchor];
        return (
          <div
            key={anchor}
            onMouseDown={(e) => {
              e.stopPropagation();
              startConnect(node.id, anchor);
            }}
            style={{
              position: "absolute",
              width: 12,
              height: 12,
              background: "#1677ff",
              borderRadius: "50%",
              cursor: "crosshair",
              left: pos.x - 6,
              top: pos.y - 6,
            }}
          />
        );
      })}
    </div>
  );
}