import React from 'react';
import { Card, Input, Select } from 'antd';
import { useFlowStore } from '../../../store/flowStore';

const ROLES = [
  { value: 'admin', label: '管理员 (Admin)' },
  { value: 'manager', label: '部门经理 (Manager)' },
  { value: 'hr', label: '人事专员 (HR)' },
  { value: 'finance', label: '财务专员 (Finance)' },
];

const PropertiesPanel: React.FC = () => {
  const { 
    nodes, 
    selectedNodeId, 
    updateNode,
    processName,
    setProcessName 
  } = useFlowStore();
  
  const node = nodes.find((n) => n.id === selectedNodeId);

  // 场景 A: 全局配置
  if (!node) {
    return (
      <Card title="流程全局配置" style={{ height: '100%' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6, fontWeight: 500 }}>流程名称：</div>
          <Input 
            value={processName} 
            onChange={(e) => setProcessName(e.target.value)} 
            placeholder="例如：请假审批流"
            maxLength={20}
            showCount
          />
        </div>
        <div style={{ fontSize: 12, color: '#999', lineHeight: '1.6' }}>
          <p>💡 提示：选中画布上的节点可配置详细属性。</p>
        </div>
      </Card>
    );
  }

  const handleRoleChange = (value: string) => {
    updateNode(node.id, {
      config: { ...node.config, approverRole: value },
    });
  };

  return (
    <Card title="节点属性" style={{ height: '100%' }}>
      {/* 1. 节点名称 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6, fontWeight: 500 }}>节点名称：</div>
        <Input
          value={node.name}
          onChange={(e) => updateNode(node.id, { name: e.target.value })}
        />
      </div>

      {/* 2. (已删除) 节点类型框 */}

      {/* 3. 审批角色配置 */}
      {node.type === 'approval' && (
        <div style={{ marginBottom: 20, padding: '12px', background: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ marginBottom: 6, fontWeight: 500, color: '#1677ff' }}>
            ⚙️ 审批人设置
          </div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            指定谁来处理该节点：
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择角色"
            value={node.config?.approverRole}
            onChange={handleRoleChange}
            options={ROLES}
          />
        </div>
      )}
    </Card>
  );
};

export default PropertiesPanel;