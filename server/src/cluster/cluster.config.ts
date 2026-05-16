import { ResourceType } from "./cluster.types.js";

export const WATCHED_RESOURCES = [
  { path: "/api/v1/pods", resourceType: ResourceType.Pod },
  { path: "/api/v1/nodes", resourceType: ResourceType.Node },
  { path: "/api/v1/services", resourceType: ResourceType.Service },
  { path: "/apis/apps/v1/deployments", resourceType: ResourceType.Deployment },
  { path: "/apis/apps/v1/replicasets", resourceType: ResourceType.ReplicaSet },
];
