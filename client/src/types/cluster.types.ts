export enum ResourceType {
  Pod = "pod",
  Node = "node",
  Service = "service",
  Deployment = "deployment",
  ReplicaSet = "replicaset",
}

export interface K8sResource {
  id: string;
  name: string;
  namespace?: string;
  status: string;
  labels: Record<string, string>;
  raw: object;
}

export interface ClusterSnapshot {
  pods: K8sResource[];
  nodes: K8sResource[];
  services: K8sResource[];
  deployments: K8sResource[];
  replicasets: K8sResource[];
}

export type WsMessage =
  | { type: "snapshot"; data: ClusterSnapshot }
  | {
      type: "resource.added";
      resourceType: ResourceType;
      resource: K8sResource;
    }
  | {
      type: "resource.modified";
      resourceType: ResourceType;
      resource: K8sResource;
    }
  | {
      type: "resource.deleted";
      resourceType: ResourceType;
      resource: K8sResource;
    }
  | { type: "connection.status"; status: "connected" | "disconnected" }
  | { type: "namespace.changed"; namespace: string }
  | { type: "watch.error"; resourceType: string; error: string }
  | { type: "pong" };
