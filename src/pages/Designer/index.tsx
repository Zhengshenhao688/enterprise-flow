//index.tsx
import React from "react";
import PropertiesPanel from "./components/PropertiesPanel";
import NodePanel from "./components/NodePanel";
import Canvas from "./components/Canvas";

const DesignerPage: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        minHeight: "60vh",
      }}
    >
      {/* 左侧：节点面板 */}
      <NodePanel />

      {/* 右侧：流程画布区域 */}
      <div style={{ flex: 1, display: "flex" }}>
        <Canvas />
        <div style={{ width: 260, marginLeft: 16 }}>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
};

export default DesignerPage;
