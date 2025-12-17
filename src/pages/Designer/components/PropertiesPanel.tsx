import React from 'react';
import { Card, Input, Select, Empty } from 'antd'; // 1. 引入 Select, Empty
import { useFlowStore } from '../../../store/flowStore';

// 定义系统中的角色列表 (模拟)
const ROLES = [
  { value: 'admin', label: '管理员 (Admin)' },
  { value: 'manager', label: '部门经理 (Manager)' },
  { value: 'hr', label: '人事专员 (HR)' },
  { value: 'finance', label: '财务专员 (Finance)' },
];

const PropertiesPanel: React.FC = () => {
  const { nodes, selectedNodeId, updateNode } = useFlowStore();
  
  // 获取当前选中的节点
  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <Card title="属性面板" style={{ height: '100%' }}>
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
           <Empty description="请点击选择一个节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      </Card>
    );
  }

  // 处理角色变更
  const handleRoleChange = (value: string) => {
    // 更新节点的 config 数据
    updateNode(node.id, {
      config: {
        ...node.config, // 保留原有的其他配置
        approverRole: value,
      },
    });
  };

  return (
    <Card title="节点属性" style={{ height: '100%' }}>
      {/* 1. 通用属性：节点名称 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6, fontWeight: 500 }}>节点名称：</div>
        <Input
          value={node.name}
          onChange={(e) => updateNode(node.id, { name: e.target.value })}
        />
      </div>

      {/* 2. 通用属性：节点类型 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6, fontWeight: 500 }}>节点类型：</div>
        <Input value={node.type} disabled />
      </div>

      {/* 3. 特有属性：审批角色配置 
         仅当节点类型为 'approval' 时显示
      */}
      {node.type === 'approval' && (
        <div style={{ marginBottom: 20, padding: '12px', background: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ marginBottom: 6, fontWeight: 500, color: '#1677ff' }}>
            ⚙️ 审批规则配置
          </div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            指定该节点由谁来审批：
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择审批角色"
            value={node.config?.approverRole} // 读取 Store 中的 config
            onChange={handleRoleChange}
            options={ROLES}
          />
        </div>
      )}
    </Card>
  );
};

export default PropertiesPanel;