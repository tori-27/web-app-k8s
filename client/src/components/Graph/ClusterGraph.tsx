import { useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { observer } from 'mobx-react-lite';
import { autorun } from 'mobx';
import { clusterStore } from '../../stores/cluster-stores';
import type { K8sResource } from '../../types/cluster.types';
import type { NodeData } from './nodes/nodeTypes';
import K8sNodeCard from './nodes/K8sNodeCard';
import PodCard from './nodes/PodCard';
import ServiceCard from './nodes/ServiceCard';
import styles from './ClusterGraph.module.css';

const nodeTypes: NodeTypes = {
  k8sNode: K8sNodeCard,
  pod: PodCard,
  service: ServiceCard,
};

const K8S_SLOT_W = 420;
const K8S_Y = 60;
const POD_START_Y = 260;
const POD_W = 160;
const POD_GAP_X = 20;
const POD_H = 74;
const POD_GAP_Y = 12;
const PODS_PER_ROW = 2;

type RawPod = { spec?: { nodeName?: string } };

function buildLayout(
  k8sNodes: K8sResource[],
  pods: K8sResource[],
  services: K8sResource[],
): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const flowNodes: Node<NodeData>[] = [];
  const flowEdges: Edge[] = [];

  k8sNodes.forEach((node, i) => {
    flowNodes.push({
      id: node.id,
      type: 'k8sNode',
      position: { x: i * K8S_SLOT_W + 30, y: K8S_Y },
      data: { resource: node },
    });
  });

  const podsByNodeName = new Map<string, K8sResource[]>();
  const unassigned: K8sResource[] = [];

  pods.forEach((pod) => {
    const nodeName = (pod.raw as RawPod).spec?.nodeName;
    if (nodeName && k8sNodes.some((n) => n.name === nodeName)) {
      const list = podsByNodeName.get(nodeName) ?? [];
      list.push(pod);
      podsByNodeName.set(nodeName, list);
    } else {
      unassigned.push(pod);
    }
  });

  k8sNodes.forEach((node, nodeIdx) => {
    const slotX = nodeIdx * K8S_SLOT_W + 30;
    const nodePods = podsByNodeName.get(node.name) ?? [];

    nodePods.forEach((pod, podIdx) => {
      const col = podIdx % PODS_PER_ROW;
      const row = Math.floor(podIdx / PODS_PER_ROW);
      flowNodes.push({
        id: pod.id,
        type: 'pod',
        position: {
          x: slotX + col * (POD_W + POD_GAP_X),
          y: POD_START_Y + row * (POD_H + POD_GAP_Y),
        },
        data: { resource: pod },
      });
      flowEdges.push({
        id: `e-${pod.id}-${node.id}`,
        source: pod.id,
        target: node.id,
        style: { stroke: '#2a2d3e', strokeWidth: 1 },
      });
    });
  });

  const unassignedBaseX = k8sNodes.length * K8S_SLOT_W + 30;
  unassigned.forEach((pod, i) => {
    const col = i % PODS_PER_ROW;
    const row = Math.floor(i / PODS_PER_ROW);
    flowNodes.push({
      id: pod.id,
      type: 'pod',
      position: {
        x: unassignedBaseX + col * (POD_W + POD_GAP_X),
        y: K8S_Y + row * (POD_H + POD_GAP_Y),
      },
      data: { resource: pod },
    });
  });

  const svcBaseX =
    (k8sNodes.length > 0 || unassigned.length > 0)
      ? (k8sNodes.length + (unassigned.length > 0 ? 1 : 0)) * K8S_SLOT_W + 80
      : 80;

  services.forEach((svc, i) => {
    flowNodes.push({
      id: svc.id,
      type: 'service',
      position: { x: svcBaseX, y: K8S_Y + i * 130 },
      data: { resource: svc },
    });
  });

  return { nodes: flowNodes, edges: flowEdges };
}

const ClusterGraph = observer(() => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const disposer = autorun(() => {
      const k8sNodes = Array.from(clusterStore.nodes.values());
      const pods = Array.from(clusterStore.pods.values());
      const services = Array.from(clusterStore.services.values());
      const layout = buildLayout(k8sNodes, pods, services);
      setNodes(layout.nodes);
      setEdges(layout.edges);
    });
    return disposer;
  }, []);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const data = node.data as NodeData;
    clusterStore.selectResource(data.resource);
  }, []);

  return (
    <div className={styles.wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#1e2235"
          gap={24}
          size={1}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'pod') return '#22c55e';
            if (n.type === 'service') return '#4f9cf9';
            return '#4a5568';
          }}
          maskColor="rgba(15, 17, 23, 0.75)"
          style={{ background: '#1a1d27' }}
        />
      </ReactFlow>
    </div>
  );
});

export default ClusterGraph;
