import { Handle, Position, type NodeProps } from 'reactflow';
import type { NodeData } from './nodeTypes';
import { getStatusColor } from './nodeUtils';
import styles from './nodes.module.css';

type RawNode = {
  status?: { addresses?: Array<{ type: string; address: string }> };
};

export default function K8sNodeCard({ data }: NodeProps<NodeData>) {
  const { resource } = data;
  const color = getStatusColor(resource.status);
  const raw = resource.raw as RawNode;
  const ip = raw.status?.addresses?.find((a) => a.type === 'InternalIP')?.address;

  return (
    <div className={styles.k8sNode}>
      <Handle type="target" position={Position.Bottom} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span className={styles.statusDot} style={{ background: color }} />
        <span className={styles.typeTag}>Node</span>
      </div>
      <div className={styles.name}>{resource.name}</div>
      <div className={styles.status} style={{ color }}>{resource.status}</div>
      {ip && (
        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>IP</span>
            <span className={styles.metaValue}>{ip}</span>
          </div>
        </div>
      )}
    </div>
  );
}
