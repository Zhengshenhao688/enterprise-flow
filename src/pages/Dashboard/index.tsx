import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Col, Row, Statistic, Typography, Empty } from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useProcessInstanceStore, type ProcessInstance } from '../../store/processInstanceStore';

const { Title, Text } = Typography;

/* =========================
   工具函数（数据计算）
========================= */

// 单条流程耗时（分钟）
const calculateDuration = (instance: ProcessInstance) => {
  if (!instance.logs || instance.logs.length === 0) return 0;
  const start = instance.createdAt;
  const end = instance.logs[instance.logs.length - 1].date;
  return Number(((end - start) / 1000 / 60).toFixed(1));
};

// 热力图数据聚合
const aggregateHeatmapData = (instances: ProcessInstance[]) => {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));

  instances.forEach(ins => {
    const d = new Date(ins.createdAt);
    grid[d.getDay()][d.getHours()] += 1;
  });

  const result: [number, number, number][] = [];
  grid.forEach((hours, day) => {
    hours.forEach((count, hour) => {
      if (count > 0) result.push([hour, day, count]);
    });
  });

  return result;
};

/* =========================
   KPI 卡片组件
========================= */

// ⭐ 修复点：修改 value 的类型定义
const KpiCard = ({
  title,
  value,
  prefix,
  color
}: {
  title: string;
  value: string | number; // 🔴 改为 string | number (之前是 React.ReactNode)
  prefix: React.ReactNode;
  color: string;
}) => (
  <Card bordered={false}>
    <Statistic
      title={<Text type="secondary">{title}</Text>}
      value={value}
      valueStyle={{
        fontSize: 28,
        fontWeight: 600,
        color
      }}
      prefix={prefix}
    />
  </Card>
);

/* =========================
   Dashboard 主体
========================= */

const Dashboard: React.FC = () => {
  const instancesMap = useProcessInstanceStore(s => s.instances);

  const { kpi, funnelData, heatmapData } = useMemo(() => {
    const all = Object.values(instancesMap);
    const total = all.length;

    const approved = all.filter(i => i.status === 'approved').length;
    const rejected = all.filter(i => i.status === 'rejected').length;
    const running = all.filter(i => i.status === 'running').length;

    const finished = all.filter(i => i.status !== 'running');
    const avgDuration = finished.length
      ? (finished.reduce((s, i) => s + calculateDuration(i), 0) / finished.length).toFixed(1)
      : '0';

    return {
      kpi: { total, approved, rejected, running, avgDuration },
      funnelData: [
        { value: total, name: '发起申请' },
        { value: total - rejected, name: '进入审批' },
        { value: approved, name: '审批通过' }
      ],
      heatmapData: aggregateHeatmapData(all)
    };
  }, [instancesMap]);

  /* =========================
     ECharts 配置
  ========================= */

  const funnelOption = {
    tooltip: { trigger: 'item', formatter: '{b} : {c}' },
    color: ['#5470c6', '#91cc75', '#fac858'],
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: 20,
        width: '70%',
        min: 0,
        max: kpi.total || 100,
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}: {c}'
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1
        },
        data: funnelData
      }
    ]
  };

  const hours = [
    '12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a',
    '12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p'
  ];
  const days = ['周日','周一','周二','周三','周四','周五','周六'];

  const heatmapOption = {
    tooltip: { position: 'top' },
    grid: { height: '55%', top: '15%' },
    xAxis: { type: 'category', data: hours, splitArea: { show: true } },
    yAxis: { type: 'category', data: days, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: 5,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '10%'
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: { show: true },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.4)'
          }
        }
      }
    ]
  };

  /* =========================
     渲染
  ========================= */

  return (
    <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <Card bordered={false} style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 0 }}>
          数据可视化看板
        </Title>
        <Text type="secondary">
          基于流程实例的实时业务分析
        </Text>
      </Card>

      {/* KPI */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <KpiCard
            title="总申请数"
            value={kpi.total}
            prefix={<BarChartOutlined />}
            color="#262626"
          />
        </Col>
        <Col span={6}>
          <KpiCard
            title="审批中"
            value={kpi.running}
            prefix={<ClockCircleOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col span={6}>
          <KpiCard
            title="通过率"
            value={`${kpi.total ? ((kpi.approved / kpi.total) * 100).toFixed(1) : 0}%`}
            prefix={<CheckCircleOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col span={6}>
          <KpiCard
            title="平均耗时（分）"
            value={kpi.avgDuration}
            prefix={<StopOutlined />}
            color="#fa541c"
          />
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={24}>
        <Col span={10}>
          <Card
            bordered={false}
            title="审批转化漏斗"
            extra={<Text type="secondary">流程从发起到完成</Text>}
            style={{ height: 520 }}
          >
            {kpi.total > 0 ? (
              <ReactECharts option={funnelOption} style={{ height: 420 }} />
            ) : (
              <Empty description="暂无数据" style={{ marginTop: 120 }} />
            )}
          </Card>
        </Col>

        <Col span={14}>
          <Card
            bordered={false}
            title="申请提交时间分布"
            extra={<Text type="secondary">按星期 & 小时</Text>}
            style={{ height: 520 }}
          >
            {kpi.total > 0 ? (
              <ReactECharts option={heatmapOption} style={{ height: 420 }} />
            ) : (
              <Empty description="暂无数据" style={{ marginTop: 120 }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;