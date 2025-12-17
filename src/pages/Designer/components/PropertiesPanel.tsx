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
    processName,      // 🆕 获取流程名称
    setProcessName    // 🆕 获取改名方法
  } = useFlowStore();
  
  const node = nodes.find((n) => n.id === selectedNodeId);

  // =========================================================
  // 🆕 场景 A: 没有选中节点 -> 显示【全局流程配置】
  // =========================================================
  if (!node) {
    return (
      <Card title="流程全局配置" style={{ height: '100%' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6, fontWeight: 500 }}>流程名称：</div>
          <Input 
            value={processName} 
            onChange={(e) => setProcessName(e.target.value)} 
            placeholder="例如：请假申请流程"
            maxLength={20}
            showCount
          />
        </div>
        <div style={{ fontSize: 12, color: '#999', lineHeight: '1.6' }}>
          <p>💡 操作提示：</p>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li>拖拽左侧节点到画布</li>
            <li>点击锚点进行连线</li>
            <li>选中节点可按 Delete 删除</li>
            <li>配置完成后点击右上角“发布”</li>
          </ul>
        </div>
      </Card>
    );
  }

  // =========================================================
  // 场景 B: 选中了节点 -> 显示【节点属性】
  // =========================================================
  const handleRoleChange = (value: string) => {
    updateNode(node.id, {
      config: { ...node.config, approverRole: value },
    });
  };

  return (
    <Card title="节点属性" style={{ height: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6, fontWeight: 500 }}>节点名称：</div>
        <Input
          value={node.name}
          onChange={(e) => updateNode(node.id, { name: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6, fontWeight: 500 }}>节点类型：</div>
        <Input value={node.type} disabled />
      </div>

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