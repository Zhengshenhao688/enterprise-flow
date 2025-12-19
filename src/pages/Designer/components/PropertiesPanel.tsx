import React from 'react';
import { Card, Input, Select, Radio, Space, Divider } from 'antd';
import { useFlowStore } from '../../../store/flowStore';
//import type { ApprovalMode } from '../../../types/flow';

// ⭐ 核心修复：角色 Value 统一全小写，确保全链路匹配 
const ROLES = [
  { value: 'admin', label: '管理员 (Admin)' },
  { value: 'manager', label: '部门经理 (Manager)' },
  { value: 'hr', label: '人事专员 (HR)' },
  { value: 'finance', label: '财务专员 (Finance)' },
];

const PropertiesPanel: React.FC = () => {
  const { nodes, selectedNodeId, updateNode, processName, setProcessName } = useFlowStore();
  const node = nodes.find((n) => n.id === selectedNodeId);

  const approverRoles =
    node?.config?.approverRoles ??
    (node?.config?.approverRole ? [node.config.approverRole] : []);

  if (!node) {
    return (
      <Card title="全局配置">
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>流程名称：</div>
          <Input 
            value={processName} 
            onChange={(e) => setProcessName(e.target.value)} 
            showCount 
            maxLength={20} 
            placeholder="例如：请假审批流"
          />
        </div>
      </Card>
    );
  }

  return (
    <Card title="节点属性" style={{ height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>节点名称：</div>
        <Input 
          value={node.name} 
          onChange={(e) => updateNode(node.id, { name: e.target.value })} 
        />
      </div>

      {node.type === 'approval' && (
        <>
          <Divider />

          {/* 审批模式 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500, color: '#1677ff' }}>
              ⚖️ 审批逻辑
            </div>
            <Radio.Group
              value={node.config?.approvalMode || 'MATCH_ANY'}
              onChange={(e) =>
                updateNode(node.id, {
                  config: {
                    ...node.config,
                    approvalMode: e.target.value,
                  },
                })
              }
            >
              <Space direction="vertical">
                <Radio value="MATCH_ANY">
                  <b>或签</b>（任意一人通过即可）
                </Radio>
                <Radio value="MATCH_ALL">
                  <b>会签</b>（所有人通过才可继续）
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          {/* 审批角色（多选） */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500, color: '#1677ff' }}>
              👤 审批角色
            </div>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="请选择审批角色（可多选）"
              options={ROLES}
              value={approverRoles}
              onChange={(values) =>
                updateNode(node.id, {
                  config: {
                    ...node.config,
                    approverRoles: values,
                  },
                })
              }
            />
          </div>
        </>
      )}
    </Card>
  );
};

export default PropertiesPanel;