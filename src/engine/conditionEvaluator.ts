// src/engine/conditionEvaluator.ts
import type { ConditionExpr, FormContext } from "./types";

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function toComparable(v: unknown): string | number | boolean | null {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  }
  return String(v);
}

export function evaluateCondition(
  condition: ConditionExpr,
  context: FormContext
): boolean {
  const l = toComparable(getByPath(context, condition.left));
  const r = toComparable(condition.right);

  switch (condition.op) {
    case "gt": return Number(l) > Number(r);
    case "gte": return Number(l) >= Number(r);
    case "lt": return Number(l) < Number(r);
    case "lte": return Number(l) <= Number(r);
    case "eq": return l === r;
    case "neq": return l !== r;
    default: return false;
  }
}