import React from 'react';
import { Card, Input } from 'antd';
import { useFlowStore } from '../../../store/flowStore';

const PropertiesPanel: React.FC = () => {
  const { nodes, selectedNodeId, updateNode } = useFlowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <Card title="属性面板" style={{ height: '100%' }}>
        请选择一个节点
      </Card>
    );
  }

  return (
    <Card title="节点属性" style={{ height: '100%' }}>
      <div style={{ marginBottom: 12 }}>
        <div>节点名称：</div>
        <Input
          value={node.name}
          onChange={(e) =>
            updateNode(node.id, { name: e.target.value }) // ⭐ 编辑名称
          }
          style={{ marginTop: 6 }}
        />
      </div>

      <div>
        <div>节点类型：</div>
        <Input value={node.type} disabled style={{ marginTop: 6 }} />
      </div>
    </Card>
  );
};

export default PropertiesPanel;