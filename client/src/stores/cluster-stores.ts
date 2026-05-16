import { makeAutoObservable } from "mobx";
import { wsClient } from "../services/wsClient";

import {
  ResourceType,
  type ClusterSnapshot,
  type K8sResource,
} from "../types/cluster.types";

class ClusterStore {
  pods: Map<string, K8sResource> = new Map();
  nodes: Map<string, K8sResource> = new Map();
  services: Map<string, K8sResource> = new Map();
  deployments: Map<string, K8sResource> = new Map();
  replicasets: Map<string, K8sResource> = new Map();

  connectionStatus: "connected" | "disconnected" | "reconnecting" =
    "disconnected";
  currentNamespace: string = "default";
  namespaces: string[] = [];
  selectedResource: K8sResource | null = null;

  constructor() {
    makeAutoObservable(this);
    this.initWsHandlers();
  }

  // --- WebSocket handlers ---
  private initWsHandlers(): void {
    wsClient.onMessage((message) => {
      switch (message.type) {
        case "snapshot":
          this.applySnapshot(message.data);
          break;
        case "resource.added":
        case "resource.modified":
          this.upsertResource(message.resourceType, message.resource);
          break;
        case "resource.deleted":
          this.deleteResource(message.resourceType, message.resource.id);
          break;
        case "connection.status":
          this.connectionStatus = message.status;
          break;
      }
    });
  }

  // --- Actions ---
  private applySnapshot(snapshot: ClusterSnapshot): void {
    this.pods.clear();
    this.nodes.clear();
    this.services.clear();

    snapshot.pods.forEach((p) => this.pods.set(p.id, p));
    snapshot.nodes.forEach((n) => this.nodes.set(n.id, n));
    snapshot.services.forEach((s) => this.services.set(s.id, s));
    snapshot.deployments.forEach((d) => this.deployments.set(d.id, d));
    snapshot.replicasets.forEach((r) => this.replicasets.set(r.id, r));
  }

  private upsertResource(type: ResourceType, resource: K8sResource): void {
    this.getMap(type).set(resource.id, resource);
  }

  private deleteResource(type: ResourceType, id: string): void {
    this.getMap(type).delete(id);
  }

  private getMap(type: ResourceType): Map<string, K8sResource> {
    switch (type) {
      case ResourceType.Pod:
        return this.pods;
      case ResourceType.Node:
        return this.nodes;
      case ResourceType.Service:
        return this.services;
      case ResourceType.Deployment:
        return this.deployments;
      case ResourceType.ReplicaSet:
        return this.replicasets;

      default:
        throw new Error(`Unknown resource type: ${type}`);
    }
  }

  selectResource(resource: K8sResource | null): void {
    this.selectedResource = resource;
  }

  setNamespaces(namespaces: string[]): void {
    this.namespaces = namespaces;
  }

  async switchNamespace(namespace: string): Promise<void> {
    this.currentNamespace = namespace;

    await fetch("http://localhost:3001/api/cluster/namespace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namespace }),
    });
  }

  get allResources(): K8sResource[] {
    return [
      ...this.pods.values(),
      ...this.nodes.values(),
      ...this.services.values(),
      ...this.deployments.values(),
      ...this.replicasets.values(),
    ];
  }

  get resourceCount(): number {
    return (
      this.pods.size +
      this.nodes.size +
      this.services.size +
      this.deployments.size +
      this.replicasets.size
    );
  }
}

export const clusterStore = new ClusterStore();
