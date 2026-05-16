import { FastifyInstance } from "fastify";
import { ClusterService } from "./cluster.service.js";

declare module "fastify" {
  interface FastifyInstance {
    clusterService: ClusterService;
  }
}

export async function clusterRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/connect", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ ok: false, error: "No file provided" });
    }

    const buffer = await data.toBuffer();
    const kubeconfig = buffer.toString("utf-8");

    try {
      fastify.clusterService.connectFromFile(kubeconfig);
      const info = fastify.clusterService.getClusterInfo();

      return {
        ok: true,
        clusterName: info?.name ?? "unknown",
        server: info?.server ?? "unknown",
      };
    } catch (err: any) {
      reply.code(400).send({ ok: false, error: err.message });
    }
  });

  fastify.delete("/disconnect", async (request, reply) => {
    if (!fastify.clusterService.isConnected()) {
      return reply.code(400).send({ ok: false, error: "Not connected" });
    }

    fastify.clusterService.disconnect();
    return { ok: true };
  });

  fastify.get("/status", async (request, reply) => {
    const connected = fastify.clusterService.isConnected();
    const info = fastify.clusterService.getClusterInfo();

    return {
      connected,
      clusterName: info?.name ?? null,
      server: info?.server ?? null,
    };
  });

  fastify.get("/snapshot", async (request, reply) => {
    if (!fastify.clusterService.isConnected()) {
      return reply.code(503).send({ error: "No cluster connected" });
    }

    try {
      const snapshot = await fastify.clusterService.getSnapshot();
      return { ok: true, data: snapshot };
    } catch (err: any) {
      reply.code(500).send({ error: err.message });
    }
  });

  fastify.get("/namespaces", async (request, reply) => {
    if (!fastify.clusterService.isConnected()) {
      return reply.code(503).send({ error: "No cluster connected" });
    }

    const namespaces = await fastify.clusterService.getNamespaces();
    return { ok: true, data: namespaces };
  });

  fastify.post("/namespace", async (request, reply) => {
    if (!fastify.clusterService.isConnected()) {
      return reply.code(503).send({ error: "No cluster connected" });
    }

    const { namespace } = request.body as { namespace: string };

    if (!namespace) {
      return reply.code(400).send({ ok: false, error: "namespace is required" });
    }

    fastify.clusterService.switchNamespace(namespace);
    return { ok: true, namespace };
  });
}
