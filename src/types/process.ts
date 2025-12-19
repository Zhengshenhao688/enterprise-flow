/**
 * 流程系统 - 核心类型定义
 * ⚠️ 只放类型，不写任何业务逻辑
 */

/**
 * 系统内角色类型
 * hr / finance 是审批角色
 * admin / user 用于系统权限（预留）
 */
export type Role =
  | 'user'
  | 'admin'
  | 'manager'
  | 'hr'
  | 'finance';

/**
 * 流程节点类型
 */
export type NodeType = 'start' | 'approval' | 'end';

/**
 * 流程节点（定义态）
 * 用于流程设计器 & 流程模板
 */
export interface ProcessNode {
  /** 节点唯一 ID */
  id: string;

  /** 节点类型 */
  type: NodeType;

  /** 节点名称（如：HR 审批、财务审批） */
  name: string;

  /**
   * 审批人角色
   * 仅 approval 节点需要
   */
  assigneeRole?: Role;

  /**
   * 下一个节点 ID
   * MVP 阶段先支持“单一下一节点（串行流程）”
   */
  nextId?: string;
}

/**
 * 流程定义（模板）
 * 对应「流程设计器」保存的结果
 */
export interface ProcessDefinition {
  /** 流程模板 ID */
  id: string;

  /** 流程名称 */
  name: string;

  /** 流程节点列表 */
  nodes: ProcessNode[];

  /** 起始节点 ID */
  startNodeId: string;
}

/**
 * 流程实例（运行态）
 * 每一次真实提交都会生成一个实例
 */
export interface ProcessInstance {
  /** 实例 ID */
  id: string;

  /** 关联的流程模板 ID */
  definitionId: string;

  /** 当前正在执行的节点 ID */
  currentNodeId: string;

  /** 流程实例状态 */
  status: 'running' | 'approved' | 'rejected';

  /** 创建时间（可选，便于列表展示） */
  createdAt?: string;
}

/**
 * 审批任务（待办）
 * 审批中心展示的最小单元
 */
export interface Task {
  /** 任务 ID */
  id: string;

  /** 所属流程实例 ID */
  instanceId: string;

  /** 所属节点 ID */
  nodeId: string;

  /** 当前任务的审批角色 */
  assigneeRole: Role;

  /** 任务状态 */
  status: 'pending' | 'approved' | 'rejected';

  /** 创建时间 */
  createdAt?: string;
}