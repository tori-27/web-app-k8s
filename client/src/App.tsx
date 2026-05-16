import { observer } from 'mobx-react-lite';
import { clusterStore } from './stores/cluster-stores';
import ConnectionPanel from './components/ConnectionPanel/ConnectionPanel';
import ClusterGraph from './components/Graph/ClusterGraph';
import ResourceSidebar from './components/Sidebar/ResourceSidebar';
import styles from './App.module.css';

const App = observer(() => {
  const connected = clusterStore.connectionStatus === 'connected';

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <ConnectionPanel />
      </aside>

      <main className={styles.canvas}>
        {connected ? (
          <ClusterGraph />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No cluster connected</div>
            <div className={styles.emptyDesc}>
              Upload a kubeconfig file from the sidebar to visualize your Kubernetes cluster.
            </div>
          </div>
        )}
      </main>

      {clusterStore.selectedResource && <ResourceSidebar />}
    </div>
  );
});

export default App;
