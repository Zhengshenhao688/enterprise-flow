import React from "react";
import { Button, Typography, Space, Select } from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export interface DesignerHeaderProps {
  publishedFlows: { id: string; name: string }[];
  editingMode: "draft" | "readonly";
  currentVersionLabel: string | null;

  onLoadFlow: (id: string) => void;
  onCreateNew: () => void;
  onPublish: () => void;
  onDuplicateDraft: () => void;
}

const DesignerHeader: React.FC<DesignerHeaderProps> = ({
  publishedFlows,
  editingMode,
  currentVersionLabel,
  onLoadFlow,
  onCreateNew,
  onPublish,
  onDuplicateDraft,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <Title level={4} style={{ margin: 0 }}>
        EnterpriseFlow · 设计器
      </Title>

      <Space>
        {/* 打开已发布流程 */}
        <Select
          placeholder="📂 打开已发布流程..."
          style={{ width: 220 }}
          popupMatchSelectWidth={false}
          onChange={onLoadFlow}
        >
          {publishedFlows.map((f) => (
            <Select.Option key={f.id} value={f.id}>
              {f.name}
            </Select.Option>
          ))}
        </Select>

        <Button onClick={onCreateNew}>新建流程</Button>

        {/* 流程状态提示 */}
        {editingMode === "readonly" && currentVersionLabel && (
          <Text type="secondary">
            已发布版本 {currentVersionLabel}（只读）
          </Text>
        )}

        {editingMode === "draft" && <Text type="warning">草稿</Text>}

        {/* 只读模式操作 */}
        {editingMode === "readonly" && (
          <Button type="primary" onClick={onDuplicateDraft}>
            基于此版本创建草稿
          </Button>
        )}

        {/* 草稿模式操作 */}
        {editingMode === "draft" && (
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={onPublish}
          >
            发布为新版本
          </Button>
        )}
      </Space>
    </div>
  );
};

export default DesignerHeader;