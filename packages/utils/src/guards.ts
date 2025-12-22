import type { ConditionExpr } from './types/flow';
import type { FormValue } from './types/process';
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

/**
 * 从 context.form 中安全读取值
 * 支持 left = "form.amount" 这种路径
 */
function getFormValue(left: string, form: Record<string, FormValue>): FormValue {
  if (!left.startsWith('form.')) return null;
  const key = left.slice('form.'.length);
  return form[key] ?? null;
}

/**
 * 条件表达式求值（用于 XOR 网关）
 */
export function evaluateCondition(
  condition: ConditionExpr | undefined,
  context: { form: Record<string, FormValue> }
): boolean {
  if (!condition) {
    console.log("[evaluateCondition] skip: no condition");
    return false;
  }

  const { left, op, right } = condition;
  const leftValue = getFormValue(left, context.form);

  console.log("[evaluateCondition] input", {
    condition,
    leftValue,
    leftType: typeof leftValue,
    rightValue: right,
    rightType: typeof right,
    contextForm: context.form,
  });

  if (leftValue == null) {
    console.log("[evaluateCondition] leftValue is null/undefined → false");
    return false;
  }

  const leftNum = Number(leftValue);
  const rightNum = Number(right);

  if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) {
    console.log("[evaluateCondition] NaN detected → false", {
      leftValue,
      rightValue: right,
    });
    return false;
  }

  let result = false;

  switch (op) {
    case "eq":
      result = leftValue === right;
      break;

    case "gt":
      result = leftNum > rightNum;
      break;

    case "gte":
      result = leftNum >= rightNum;
      break;

    case "lt":
      result = leftNum < rightNum;
      break;

    case "lte":
      result = leftNum <= rightNum;
      break;

    default:
      result = false;
  }

  console.log("[evaluateCondition] result", {
    op,
    leftNum,
    rightNum,
    result,
  });

  return result;
}
