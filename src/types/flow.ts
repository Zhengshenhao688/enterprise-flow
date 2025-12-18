/** 审批模式：MATCH_ALL (会签), MATCH_ANY (或签) */
export type ApprovalMode = 'MATCH_ALL' | 'MATCH_ANY';

/** 锚点类型 */
export type AnchorType = "top" | "right" | "bottom" | "left";

/** 节点配置信息 */
export type NodeConfig = {
  approverRole?: string;
  // --- Phase 1 新增 ---
  approvalMode: ApprovalMode;   // 审批模式
  approverList: string[];       // 审批人ID列表
  processedUsers: string[];     // 运行时：已投通过票的用户ID
};

/** 流程节点定义 */
export type FlowNode = {
  id: string;
  type: 'start' | 'approval' | 'condition' | 'end' | string;
  name: string;
  position: { x: number; y: number };
  config: NodeConfig; // 将 config 设为必选，方便逻辑处理
};

/** 流程连线定义 */
export type FlowEdge = {
  id: string;
  from: { nodeId: string; anchor: AnchorType };
  to: { nodeId: string; anchor: AnchorType };
};

/** 流程定义快照 */
export type ProcessDefinition = {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};