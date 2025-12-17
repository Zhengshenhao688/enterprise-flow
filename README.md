# 🚀 EnterpriseFlow - 企业级低代码流程引擎

![React](https://img.shields.io/badge/React-18.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Zustand](https://img.shields.io/badge/State-Zustand-orange?style=flat-square)
![Ant Design](https://img.shields.io/badge/UI-AntDesign-red?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

> 一个基于 React + Zustand + TypeScript 构建的轻量级、高性能低代码工作流引擎。实现了从 **可视化流程设计**、**动态表单发起** 到 **RBAC 审批工作流** 及 **数据大屏** 的完整闭环。

---

## ✨ 项目亮点 (Key Features)

### 🎨 1. 可视化流程设计器 (Visual Designer)
采用了 **"三明治" 分层渲染架构** (SVG Edges 底层 + HTML Nodes 中层 + Interaction 顶层)，实现了丝滑的拖拽与连线体验。
- **拖拽建模**：支持节点自由拖拽，实时吸附对齐。
- **智能连线**：基于贝塞尔曲线 (Cubic Bezier) 的平滑连线，支持橡皮筋 (Rubber-band) 交互效果。
- **逻辑约束**：强制执行 "左进右出" (Left-in, Right-out) 规范，防止连线混乱。
- **图算法校验**：内置 **BFS (广度优先搜索)** 算法，在发布前自动检测 **连通性**、**死循环**、**断路** 及 **孤儿节点**，确保流程逻辑严密。

![Designer Demo](./assets/designer.png)

### 🔐 2. RBAC 权限控制体系
- 内置 `Admin`, `Manager`, `HR`, `Finance` 等多角色权限模型。
- **动态审批流**：不同节点可配置特定角色的审批权限，非当前角色无法操作。
- **权限隔离**：工作台仅展示当前用户有权处理的待办任务。

### 📊 3. 全链路可视化追踪
- **实时进度图**：基于流程蓝图 (Blueprint) 快照，自动生成可视化进度条。
- **状态映射**：通过不同颜色 (蓝/绿/红/灰) 实时反馈节点状态 (Running/Approved/Rejected/Waiting)。
- **数据看板**：集成 ECharts，对审批效率、通过率进行时序聚合分析。

---

## 🛠 技术栈 (Tech Stack)

* **核心框架**: React 18, TypeScript, Vite
* **状态管理**: Zustand (配合 Persist 中间件实现本地持久化)
* **UI 组件库**: Ant Design 5.0
* **图表可视化**: Apache ECharts
* **工具库**: Nanoid (ID生成), Dayjs (时间处理)
* **路由**: React Router v6

---

## 📂 核心实现细节 (Implementation Details)

### 1. 流程图数据结构
采用 **节点 (Nodes) + 边 (Edges)** 的图结构存储：

```typescript
// 节点定义
type FlowNode = {
  id: string;
  type: 'start' | 'approval' | 'end';
  position: { x: number, y: number };
  config: { approverRole?: string }; // 业务配置
};

// 连线定义
type FlowEdge = {
  from: { nodeId: string, anchor: 'right' | 'bottom' };
  to: { nodeId: string, anchor: 'left' | 'top' };
};