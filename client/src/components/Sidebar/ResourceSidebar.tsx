import { observer } from 'mobx-react-lite';
import { clusterStore } from '../../stores/cluster-stores';
import { ResourceType } from '../../types/cluster.types';
import { getStatusColor } from '../Graph/nodes/nodeUtils';
import styles from './ResourceSidebar.module.css';

type RawPod = {
  spec?: { nodeName?: string };
  status?: { containerStatuses?: Array<{ name: string; image: string }> };
};

type RawNode = {
  status?: { capacity?: { cpu?: string; memory?: string } };
};

type RawService = {
  spec?: { type?: string; clusterIP?: string };
};

function resourceTypeName(resource: { id: string }): string {
  const id = resource.id;
  if (id.startsWith('pod-') || id.includes('/pod/')) return 'Pod';
  if (id.startsWith('node-') || id.includes('/node/')) return 'Node';
  if (id.startsWith('svc-') || id.includes('/service/')) return 'Service';
  return 'Resource';
}

function guessType(id: string): ResourceType | null {
  if (id.startsWith('pod-') || id.includes('-pod-')) return ResourceType.Pod;
  if (id.startsWith('node-') || id.includes('-node-')) return ResourceType.Node;
  if (id.startsWith('svc-') || id.includes('-service-') || id.includes('-svc-')) return ResourceType.Service;
  return null;
}

function PodDetails({ raw }: { raw: RawPod }) {
  const nodeName = raw.spec?.nodeName;
  const containers = raw.status?.containerStatuses ?? [];

  return (
    <>
      {nodeName && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Placement</div>
          <div className={styles.infoTable}>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Node</span>
              <span className={styles.infoVal}>{nodeName}</span>
            </div>
          </div>
        </div>
      )}
      {containers.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Containers ({containers.length})</div>
          <div className={styles.infoTable}>
            {containers.map((c) => (
              <div key={c.name} className={styles.infoRow}>
                <span className={styles.infoKey}>{c.name}</span>
                <span className={styles.infoVal}>
                  <span className={styles.imageTag}>{c.image}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function NodeDetails({ raw }: { raw: RawNode }) {
  const capacity = raw.status?.capacity;
  if (!capacity) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Capacity</div>
      <div className={styles.infoTable}>
        {capacity.cpu && (
          <div className={styles.infoRow}>
            <span className={styles.infoKey}>CPU</span>
            <span className={styles.infoVal}>{capacity.cpu}</span>
          </div>
        )}
        {capacity.memory && (
          <div className={styles.infoRow}>
            <span className={styles.infoKey}>Memory</span>
            <span className={styles.infoVal}>{capacity.memory}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceDetails({ raw }: { raw: RawService }) {
  const spec = raw.spec;
  if (!spec) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Spec</div>
      <div className={styles.infoTable}>
        {spec.type && (
          <div className={styles.infoRow}>
            <span className={styles.infoKey}>Type</span>
            <span className={styles.infoVal}>{spec.type}</span>
          </div>
        )}
        {spec.clusterIP && (
          <div className={styles.infoRow}>
            <span className={styles.infoKey}>ClusterIP</span>
            <span className={styles.infoVal}>{spec.clusterIP}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const ResourceSidebar = observer(() => {
  const resource = clusterStore.selectedResource;
  if (!resource) return null;

  const color = getStatusColor(resource.status);
  const labelEntries = Object.entries(resource.labels ?? {});
  const detectedType = guessType(resource.id);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.resourceType}>{resourceTypeName(resource)}</span>
        </div>
        <button className={styles.closeBtn} onClick={() => clusterStore.selectResource(null)}>
          ×
        </button>
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.name}>{resource.name}</div>
          {resource.namespace && (
            <div className={styles.namespace}>{resource.namespace}</div>
          )}
        </div>

        <div className={styles.statusRow}>
          <span
            className={styles.statusBadge}
            style={{ background: `${color}18`, border: `1px solid ${color}40` }}
          >
            <span className={styles.statusDot} style={{ background: color }} />
            <span style={{ color }}>{resource.status}</span>
          </span>
        </div>

        {labelEntries.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Labels</div>
            <div className={styles.labels}>
              {labelEntries.map(([k, v]) => (
                <span key={k} className={styles.labelTag}>
                  <span className={styles.labelKey}>{k}</span>={v}
                </span>
              ))}
            </div>
          </div>
        )}

        {detectedType === ResourceType.Pod && (
          <PodDetails raw={resource.raw as RawPod} />
        )}
        {detectedType === ResourceType.Node && (
          <NodeDetails raw={resource.raw as RawNode} />
        )}
        {detectedType === ResourceType.Service && (
          <ServiceDetails raw={resource.raw as RawService} />
        )}
      </div>
    </aside>
  );
});

export default ResourceSidebar;
