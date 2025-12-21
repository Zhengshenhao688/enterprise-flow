// src/engine/approvalPath.ts
import type {
  EngineFlowDefinition,
  FormContext,
  ApprovalPathNode,
  EngineFlowNode
} from "./types";
import { resolveNextNodeId } from "./gatewayResolver";

function isApprovalNode(node: EngineFlowNode): boolean {
  return node.type === "approval";
}

export function buildApprovalPath(
  def: EngineFlowDefinition,
  context: FormContext
): ApprovalPathNode[] {
  const start = def.nodes.find(n => n.type === "start");
  if (!start) return [];

  const visited = new Set<string>();
  const result: ApprovalPathNode[] = [];

  let cursor: string | null = start.id;
  let guard = 0;

  while (cursor && guard < 200) {
    guard++;
    if (visited.has(cursor)) break;
    visited.add(cursor);

    const node = def.nodes.find(n => n.id === cursor);
    if (!node) break;

    if (isApprovalNode(node)) {
      result.push({
        id: node.id,
        label: node.label ?? "审批节点"
      });
    }

    if (node.type === "end") break;
    cursor = resolveNextNodeId(def, cursor, context);
  }

  return result;
}