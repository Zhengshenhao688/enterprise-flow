// src/engine/conditionEvaluator.ts
import type { ConditionExpr, FormContext } from "./types";

function getValue(path: string, ctx: FormContext): unknown {
  const form = ctx.form;

  // 支持 "amount"
  if (path in form) {
    return (form as Record<string, unknown>)[path];
  }

  // 支持 "form.amount"
  if (path.startsWith("form.")) {
    const key = path.slice("form.".length);
    return (form as Record<string, unknown>)[key];
  }

  return undefined;
}

export function evaluateCondition(
  expr: ConditionExpr,
  ctx: FormContext
): boolean {
  const left = getValue(expr.left, ctx);
  const right = expr.right;

  // 防御：取不到值直接 false
  if (left === undefined) {
    console.warn("[conditionEvaluator] left value not found", expr, ctx);
    return false;
  }

  switch (expr.op) {
    case "gt":
      return Number(left) > Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "lte":
      return Number(left) <= Number(right);
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    default:
      console.warn("[conditionEvaluator] unknown op", expr.op);
      return false;
  }
}