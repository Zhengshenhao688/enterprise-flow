export class ApprovalGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalGuardError';
  }
}

export function assertTaskAtCurrentNode(params: { taskNodeId: string; currentNodeId: string | null }): void {
  const { taskNodeId, currentNodeId } = params;
  if (!currentNodeId || currentNodeId !== taskNodeId) {
    throw new ApprovalGuardError('流程未到该节点，禁止抢跑审批');
  }
}
