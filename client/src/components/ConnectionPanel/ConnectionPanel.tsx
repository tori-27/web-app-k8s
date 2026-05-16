import { useState, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { clusterStore } from '../../stores/cluster-stores';
import { wsClient } from '../../services/wsClient';
import NamespaceSelector from './NamespaceSelector';
import styles from './ConnectionPanel.module.css';

const ConnectionPanel = observer(() => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConnect = useCallback(async (file: File) => {
    setIsConnecting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3001/api/cluster/connect', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Connection failed (${res.status})`);
      }

      wsClient.connect();

      const nsRes = await fetch('http://localhost:3001/api/cluster/namespaces');
      const nsData = await nsRes.json() as { ok: boolean; data: string[] };
      if (nsData.ok) {
        clusterStore.setNamespaces(nsData.data);
      }
    } catch (e) {
      setError((e as Error).message);
      setSelectedFile(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleFileChange = useCallback((file: File) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDisconnect = useCallback(async () => {
    try {
      await fetch('http://localhost:3001/api/cluster/disconnect', { method: 'DELETE' });
    } catch {
      // ignore
    }
    wsClient.disconnect();
    setSelectedFile(null);
    setError(null);
    clusterStore.selectResource(null);
  }, []);

  const connected = clusterStore.connectionStatus === 'connected';

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.appTitle}>K8s Visualizer</div>
        <div className={styles.appSubtitle}>Cluster graph explorer</div>
      </div>

      <div className={styles.body}>
        {connected ? (
          <>
            <div className={styles.connectedStatus}>
              <span className={styles.statusDot} />
              <span className={styles.statusText}>Connected</span>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Nodes</span>
                <span className={styles.statValue}>{clusterStore.nodes.size}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Pods</span>
                <span className={styles.statValue}>{clusterStore.pods.size}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Services</span>
                <span className={styles.statValue}>{clusterStore.services.size}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Deployments</span>
                <span className={styles.statValue}>{clusterStore.deployments.size}</span>
              </div>
            </div>

            <NamespaceSelector />

            <button className={styles.disconnectBtn} onClick={handleDisconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <>
            <div
              className={`${styles.dropzone} ${isDragOver ? styles.dropzoneDragOver : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <div className={styles.dropzoneIcon}>⬆</div>
              <div className={styles.dropzoneText}>
                Drop kubeconfig here
                <br />
                or click to browse
              </div>
              <div className={styles.dropzoneHint}>~/.kube/config or any kubeconfig file</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className={styles.hiddenInput}
              onChange={handleInputChange}
              accept="*/*"
            />

            {selectedFile && (
              <div className={styles.selectedFile}>📄 {selectedFile.name}</div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.connectBtn}
              disabled={!selectedFile || isConnecting}
              onClick={() => selectedFile && handleConnect(selectedFile)}
            >
              {isConnecting ? 'Connecting…' : 'Connect'}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default ConnectionPanel;
