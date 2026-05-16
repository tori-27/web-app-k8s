import { type NodeProps } from 'reactflow';
import type { NodeData } from './nodeTypes';
import styles from './nodes.module.css';

type RawService = {
  spec?: { type?: string; clusterIP?: string };
};

export default function ServiceCard({ data }: NodeProps<NodeData>) {
  const { resource } = data;
  const raw = resource.raw as RawService;
  const svcType = raw.spec?.type ?? 'ClusterIP';
  const clusterIP = raw.spec?.clusterIP;

  return (
    <div className={styles.service} style={{ position: 'relative' }}>
      <div className={styles.serviceAccent} />
      <div className={styles.nodeHeader} style={{ paddingLeft: 8 }}>
        <span className={styles.statusDot} style={{ background: '#4f9cf9' }} />
        <span className={styles.typeTag}>Service</span>
      </div>
      <div className={styles.name} style={{ paddingLeft: 8 }}>{resource.name}</div>
      {resource.namespace && (
        <div className={styles.namespace} style={{ paddingLeft: 8 }}>{resource.namespace}</div>
      )}
      <div className={styles.meta} style={{ paddingLeft: 8 }}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Type</span>
          <span className={styles.metaValue}>{svcType}</span>
        </div>
        {clusterIP && clusterIP !== 'None' && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>ClusterIP</span>
            <span className={styles.metaValue}>{clusterIP}</span>
          </div>
        )}
      </div>
    </div>
  );
}
