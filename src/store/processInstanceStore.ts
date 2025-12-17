import { create } from "zustand";
import { nanoid } from "nanoid";
import type { ProcessDefinition } from "./flowStore";

// =======================================================
// 类型定义 (Type Definitions)
// =======================================================

export type InstanceStatus = "running" | "approved" | "rejected";

export type ProcessInstance = {
  instanceId: string;
  processDefinitionId: string;
  /**
   * 当前停留的节点 ID
   * 流程启动时，会自动指向 type === 'start' 的节点
   */
  currentNodeId: string | null;
  status: InstanceStatus;
  /**
   * ⭐️ 关键：保存流程定义的快照 (Snapshot)
   * 即使后续修改了 flowStore 里的模板，这个正在运行的实例也不受影响
   */
  definitionSnapshot: ProcessDefinition;
  /** 创建时间 */
  createdAt: number;
};

type ProcessInstanceStore = {
  // 使用 Record 结构存储，方便通过 id O(1) 查找
  instances: Record<string, ProcessInstance>;

  // --- 核心方法 ---
  
  /**
   * 发起流程
   * @param definition 从 flowStore 获取的流程定义
   * @returns 新创建的 instanceId
   */
  startProcess: (definition: ProcessDefinition) => string;

  /**
   * 获取流程实例详情
   */
  getInstanceById: (instanceId: string) => ProcessInstance | undefined;

  /**
   * 审批通过（核心推进逻辑）
   * 驱动流程从当前节点移动到下一个节点
   */
  approve: (instanceId: string) => void;

  /**
   * (预留) 简单的状态更新方法
   */
  updateInstanceStatus: (instanceId: string, status: InstanceStatus) => void;
};

// =======================================================
// Store 实现
// =======================================================

export const useProcessInstanceStore = create<ProcessInstanceStore>((set, get) => ({
  instances: {},

  startProcess: (definition: ProcessDefinition) => {
    // 1. 寻找 Start 节点作为起始点
    const startNode = definition.nodes.find((n) => n.type === "start");
    
    // 2. 生成实例 ID
    const newInstanceId = nanoid();

    // 3. 构建实例对象
    const newInstance: ProcessInstance = {
      instanceId: newInstanceId,
      processDefinitionId: definition.id,
      // 如果没有 start 节点，就置空（实际业务中应报错）
      currentNodeId: startNode ? startNode.id : null, 
      status: "running",
      definitionSnapshot: definition, // 保存当前版本的快照
      createdAt: Date.now(),
    };

    // 4. 存入 Store
    set((state) => ({
      instances: {
        ...state.instances,
        [newInstanceId]: newInstance,
      },
    }));

    console.log(`[Process] 实例已创建: ${newInstanceId}, 当前节点: ${startNode?.name}`);
    return newInstanceId;
  },

  getInstanceById: (instanceId: string) => {
    const { instances } = get();
    return instances[instanceId];
  },

  approve: (instanceId: string) => {
    set((state) => {
      const instance = state.instances[instanceId];
      
      // 1. 校验：实例是否存在，且状态必须是运行中
      if (!instance || instance.status !== "running") {
        console.warn("[Approve] 实例不存在或已结束");
        return state;
      }

      const { currentNodeId, definitionSnapshot } = instance;
      
      // 2. 查找连线：找到从当前节点出发的那条线 (假设单线，只找第一条)
      // 逻辑：CurrentNode -> Edge -> NextNode
      const outgoingEdge = definitionSnapshot.edges.find(
        (edge) => edge.from.nodeId === currentNodeId
      );

      if (!outgoingEdge) {
        console.warn("[Approve] 当前节点没有后续路径 (可能是孤立节点或到达末端)");
        return state;
      }

      const nextNodeId = outgoingEdge.to.nodeId;
      const nextNode = definitionSnapshot.nodes.find((n) => n.id === nextNodeId);

      // 3. 判断是否到达结束节点
      let newStatus: InstanceStatus = "running";
      if (nextNode && nextNode.type === "end") {
        newStatus = "approved"; // 只要走到 End 节点，视为流程审批通过
        console.log(`[Approve] 流程到达结束节点，状态更新为: ${newStatus}`);
      } else {
        console.log(`[Approve] 节点流转: ${currentNodeId} -> ${nextNodeId}`);
      }

      // 4. 更新实例状态 (Immutable update)
      return {
        instances: {
          ...state.instances,
          [instanceId]: {
            ...instance,
            currentNodeId: nextNodeId, // 指针移动
            status: newStatus,         // 状态可能变更
          },
        },
      };
    });
  },

  updateInstanceStatus: (instanceId, status) => {
    set((state) => {
      const instance = state.instances[instanceId];
      if (!instance) return state;

      return {
        instances: {
          ...state.instances,
          [instanceId]: { ...instance, status },
        },
      };
    });
  },
}));