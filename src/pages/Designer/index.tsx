import React from 'react';
import { Card, Typography, Space } from 'antd';

const { Title, Text } = Typography;

const NODE_TYPES = [
  {
    type: 'start',
    label: '开始节点',
    description: '流程起点',
  },
  {
    type: 'approval',
    label: '审批节点',
    description: '常规审批、人事/财务审批等',
  },
  {
    type: 'end',
    label: '结束节点',
    description: '流程结束节点',
  },
];

const DesignerPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        minHeight: '60vh', 
      }}
    >
      {/* 左侧：节点面板 */}
      <div style={{ width: 240 }}>
        <Card
          title="节点面板"
          bordered={false}
          style={{ height: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {NODE_TYPES.map((node) => (
              <Card
                key={node.type}
                size="small"
                hoverable
                style={{ cursor: 'grab' }}
              >
                <Title level={5} style={{ marginBottom: 4 }}>
                  {node.label}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {node.description}
                </Text>
              </Card>
            ))}
          </Space>
        </Card>
      </div>

      {/* 右侧：流程画布区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 8 }}>
          <Title level={4} style={{ margin: 0 }}>
            流程设计画布
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            后续会在此区域支持节点拖拽、连线与属性配置
          </Text>
        </div>

        <div
          style={{
            flex: 1,
            borderRadius: 8,
            border: '1px dashed #d9d9d9',
            background:
              'repeating-linear-gradient(0deg, #fafafa, #fafafa 24px, #f5f5f5 24px, #f5f5f5 25px)',
            position: 'relative',
            minHeight: 400,
          }}
        >
          {/* 这里以后会渲染节点与连线，现在只是占位提示 */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Text type="secondary">
              画布区域（阶段 3.2 开始支持从左侧拖拽节点到这里）
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignerPage;