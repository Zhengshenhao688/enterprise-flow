/** 审批模式：MATCH_ALL (会签), MATCH_ANY (或签) */
export type ApprovalMode = 'MATCH_ALL' | 'MATCH_ANY'; // [cite: 193]

/** 锚点类型 */
export type AnchorType = "top" | "right" | "bottom" | "left"; // [cite: 194]

/** 节点配置信息 */
export type NodeConfig = {
  approverRole?: string; // 
  // --- Phase 1 核心字段 ---
  approverRoles?: string[];
  approvalMode: ApprovalMode;   
  processedUsers: string[];     // 运行时：已投通过票的用户ID [cite: 195]
};

/** 流程节点定义 */
export type FlowNode = {
  id: string; // [cite: 196]
  type: 'start' | 'approval' | 'condition' | 'end' | string; // [cite: 197]
  name: string; // [cite: 197]
  position: { x: number; y: number }; // [cite: 197]
  config: NodeConfig; // 将 config 设为必选，方便逻辑处理 [cite: 197]
};

/** 流程连线定义 */
export type FlowEdge = {
  id: string; // [cite: 198]
  from: { nodeId: string; anchor: AnchorType }; // [cite: 198]
  to: { nodeId: string; anchor: AnchorType }; // [cite: 199]
};

/** 流程定义快照 */
export type ProcessDefinition = {
  id: string; // [cite: 199]
  name: string; // [cite: 199]
  nodes: FlowNode[]; // [cite: 200]
  edges: FlowEdge[]; // [cite: 200]
};

// =======================================================
// UI 创建节点时使用的输入类型（不要求 config）
// =======================================================
export type CreateFlowNode = Omit<FlowNode, "config"> & {
  config?: Partial<FlowNode["config"]>;
};