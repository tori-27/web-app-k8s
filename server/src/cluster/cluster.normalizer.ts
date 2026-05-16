import { K8sResource, ResourceType } from "./cluster.types.js";

export const normalizeResource = (
  resourceType: ResourceType,
  obj: any,
): K8sResource => {
  return {
    id: obj.metadata?.uid ?? "",
    name: obj.metadata?.name ?? "",
    namespace: obj.metadata?.namespace,
    status: extractStatus(resourceType, obj),
    labels: obj.metadata?.labels ?? {},
    raw: obj,
  };
};

const extractStatus = (resourceType: ResourceType, obj: any): string => {
  switch (resourceType) {
    case "pod":
      return obj.status?.phase ?? "Unknown";
    case "node":
      return obj.status?.conditions?.find((c: any) => c.type === "Ready")
        ?.status === "True"
        ? "Ready"
        : "NotReady";
    case "service":
      return obj.spec?.type ?? "ClusterIP";
    default:
      return "Unknown";
  }
};
