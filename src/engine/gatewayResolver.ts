// src/engine/gatewayResolver.ts
import type { EngineFlowDefinition, FormContext } from "./types";
import { evaluateCondition } from "./conditionEvaluator";

export function resolveNextNodeId(
  def: EngineFlowDefinition,
  currentNodeId: string,
  context: FormContext
): string | null {
  const outgoing = def.edges.filter(e => e.from.nodeId === currentNodeId);
  if (!outgoing.length) return null;

  for (const edge of outgoing) {
    if (edge.condition && evaluateCondition(edge.condition, context)) {
      return edge.to.nodeId;
    }
  }

  const defEdge = outgoing.find(e => e.isDefault);
  return defEdge?.to.nodeId ?? null;
}