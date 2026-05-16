import { EventEmitter } from "events";
import * as k8s from "@kubernetes/client-node";
import { K8sResource, ResourceEvent, ResourceType } from "./cluster.types.js";
import { WATCHED_RESOURCES } from "./cluster.config.js";
import { normalizeResource } from "./cluster.normalizer.js";

export class ClusterService extends EventEmitter {
  private kc: k8s.KubeConfig | null = null;
  private watches: AbortController[] = [];
  private connected = false;
  private currentNamespace: string = "default";

  connectFromFile(kubeconfigContent: string): void {
    if (this.connected) {
      this.disconnect();
    }

    this.kc = new k8s.KubeConfig();
    this.kc.loadFromString(kubeconfigContent);

    this._finishConnection();
  }

  connectFromDefault(): void {
    if (this.connected) {
      this.disconnect();
    }

    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();

    const cluster = this.kc.getCurrentCluster();
    if (!cluster?.server) {
      throw new Error("No cluster found in default kubeconfig");
    }

    this._finishConnection();
  }

  connectFromCluster(): void {
    if (this.connected) {
      this.disconnect();
    }

    this.kc = new k8s.KubeConfig();
    this.kc.loadFromCluster();

    const cluster = this.kc.getCurrentCluster();
    if (!cluster?.server) {
      throw new Error(
        "In-cluster config unavailable: KUBERNETES_SERVICE_HOST and KUBERNETES_SERVICE_PORT must be set",
      );
    }
    new URL(cluster.server); // validates the URL is well-formed

    this._finishConnection();
  }

  private _finishConnection(): void {
    this.connected = true;
    this.emit("connection.status", { status: "connected" });
    this.startWatches("default");
  }

  switchNamespace(namespace: string): void {
    this.currentNamespace = namespace;
    this.stopWatches();
    this.startWatches(namespace);
    this.emit("namespace.changed", { namespace });
  }

  disconnect(): void {
    this.stopWatches();
    this.kc = null;
    this.connected = false;
    this.emit("connection.status", { status: "disconnected" });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClusterInfo(): { name: string; server: string } | null {
    if (!this.kc) return null;

    const cluster = this.kc.getCurrentCluster();
    const context = this.kc.getCurrentContext();

    return {
      name: context ?? "unknown",
      server: cluster?.server ?? "unknown",
    };
  }

  async getSnapshot(namespace: string = this.currentNamespace): Promise<{
    pods: K8sResource[];
    nodes: K8sResource[];
    services: K8sResource[];
  }> {
    if (!this.kc) throw new Error("Not connected");

    const coreApi = this.kc.makeApiClient(k8s.CoreV1Api);

    const [podsRes, nodesRes, servicesRes] = await Promise.all([
      namespace === "all"
        ? coreApi.listPodForAllNamespaces()
        : coreApi.listNamespacedPod({ namespace }),
      coreApi.listNode(),
      namespace === "all"
        ? coreApi.listServiceForAllNamespaces()
        : coreApi.listNamespacedService({ namespace }),
    ]);

    return {
      pods: podsRes.items.map((obj) =>
        normalizeResource(ResourceType.Pod, obj),
      ),
      nodes: nodesRes.items.map((obj) =>
        normalizeResource(ResourceType.Node, obj),
      ),
      services: servicesRes.items.map((obj) =>
        normalizeResource(ResourceType.Service, obj),
      ),
    };
  }

  private stopWatches(): void {
    this.watches.forEach((w) => w.abort());
    this.watches = [];
  }

  private startWatches(namespace: string): void {
    if (!this.kc) return;

    WATCHED_RESOURCES.forEach(({ path, resourceType }) => {
      const watchPath = this.buildWatchPath(path, namespace);
      this.watchResource(watchPath, resourceType, (obj) =>
        normalizeResource(resourceType, obj),
      );
    });
  }

  private buildWatchPath(basePath: string, namespace: string): string {
    if (basePath.includes("nodes")) return basePath;
    return basePath.replace("/api/v1/", `/api/v1/namespaces/${namespace}/`);
  }

  private watchResource(
    path: string,
    resourceType: ResourceType,
    normalizer: (obj: any) => K8sResource,
  ): void {
    if (!this.kc) return;

    const watch = new k8s.Watch(this.kc);

    const startWatch = async () => {
      const controller = await watch.watch(
        path,
        {},
        (type, obj) => this.onEvent(type, obj, resourceType, normalizer),
        (error) => this.onError(error, resourceType, startWatch),
      );
      this.watches.push(controller);
    };

    startWatch();
  }

  onEvent(
    type: string,
    obj: any,
    resourceType: ResourceType,
    normalizer: (obj: any) => K8sResource,
  ): void {
    if (!["ADDED", "MODIFIED", "DELETED"].includes(type)) return;

    const event: ResourceEvent = {
      type: type as ResourceEvent["type"],
      resourceType,
      resource: normalizer(obj),
    };

    this.emit("resource.event", event);
  }

  onError(
    error: Error,
    resourceType: ResourceType,
    startWatch: () => void,
  ): void {
    if (!this.connected) return;

    this.emit("watch.error", { resourceType, error: error?.message });

    setTimeout(() => {
      if (this.connected) startWatch();
    }, 5000);
  }

  async getNamespaces(): Promise<string[]> {
    if (!this.kc) throw new Error("Not connected");

    const coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    const res = await coreApi.listNamespace();

    return res.items.map((ns) => ns.metadata?.name ?? "").filter(Boolean);
  }

  getCurrentNamespace(): string {
    return this.currentNamespace;
  }
}
