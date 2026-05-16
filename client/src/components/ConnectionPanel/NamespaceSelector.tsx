import { observer } from 'mobx-react-lite';
import { clusterStore } from '../../stores/cluster-stores';
import styles from './NamespaceSelector.module.css';

const NamespaceSelector = observer(() => {
  if (clusterStore.connectionStatus !== 'connected') return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    clusterStore.switchNamespace(e.target.value).catch(console.error);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.label}>Namespace</div>
      <select
        className={styles.select}
        value={clusterStore.currentNamespace}
        onChange={handleChange}
      >
        <option value="all">All namespaces</option>
        {clusterStore.namespaces.map((ns) => (
          <option key={ns} value={ns}>
            {ns}
          </option>
        ))}
      </select>
    </div>
  );
});

export default NamespaceSelector;
