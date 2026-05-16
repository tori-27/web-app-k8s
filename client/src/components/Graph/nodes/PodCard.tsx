import { Handle, Position, type NodeProps } from 'reactflow';
import type { NodeData } from './nodeTypes';
import { getStatusColor } from './nodeUtils';
import styles from './nodes.module.css';

export default function PodCard({ data }: NodeProps<NodeData>) {
  const { resource } = data;
  const color = getStatusColor(resource.status);

  return (
    <div className={styles.pod}>
      <Handle type="source" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span className={styles.statusDot} style={{ background: color }} />
        <span className={styles.typeTag}>Pod</span>
      </div>
      <div className={styles.name}>{resource.name}</div>
      {resource.namespace && (
        <div className={styles.namespace}>{resource.namespace}</div>
      )}
    </div>
  );
}
