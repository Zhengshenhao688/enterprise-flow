import { anchorOffsets, useFlowStore } from "../../../store/flowStore";
import type { AnchorType, FlowNode } from "../../../store/flowStore";

export default function NodeItem({ node }: { node: FlowNode }) {
  const startConnect = useFlowStore((s) => s.startConnect);
  const endConnect = useFlowStore((s) => s.endConnect);
  const connectionDraft = useFlowStore((s) => s.connectionDraft);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);

  const isSelected = selectedNodeId === node.id;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNodeId(node.id);
      }}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 100,
        height: 100,
        background: "#fff",
        border: isSelected ? "2px solid #1677ff" : "1px solid #d9d9d9",
        borderRadius: 8,
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        userSelect: "none",
      }}
    >
      {/* 节点文字 */}
      <div style={{ textAlign: "center", marginTop: 35, fontSize: 14 }}>
        {node.name}
      </div>

      {/* 四个锚点 */}
      {(["top", "right", "bottom", "left"] as AnchorType[]).map((anchor) => {
        const pos = anchorOffsets[anchor];

        return (
          <div
            key={anchor}
            onMouseDown={(e) => {
              e.stopPropagation();
              // 从当前锚点开始连线
              startConnect(node.id, anchor);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              // 如果当前存在起点，则将当前锚点作为终点，完成连线
              if (connectionDraft) {
                endConnect(node.id, anchor);
              }
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
