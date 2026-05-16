import Fastify, { type FastifyError } from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { clusterRoutes } from "./cluster/cluster.routes.js";
import { WsGateway } from "./gateway/ws.gateway.js";
import { ClusterService } from "./cluster/cluster.service.js";

const fastify = Fastify({ logger: true });

// --- Plugins ---
await fastify.register(cors, { origin: "http://localhost:5174" });
await fastify.register(websocket);
await fastify.register(multipart);

// --- Services ---
const clusterService = new ClusterService();
const wsGateway = new WsGateway(clusterService);

fastify.decorate("clusterService", clusterService);
fastify.decorate("wsGateway", wsGateway);

// --- Global error handler ---
fastify.setErrorHandler<FastifyError>((error, request, reply) => {
  fastify.log.error(error);
  reply.code(error.statusCode ?? 500).send({
    ok: false,
    error: error.message,
  });
});

// --- Routes ---
await fastify.register(clusterRoutes, { prefix: "/api/cluster" });

// --- WebSocket ---
fastify.get("/ws", { websocket: true }, (socket) => {
  wsGateway.handleConnection(socket);
});

// --- Start ---
try {
  fastify.clusterService.connectFromCluster();
  fastify.log.info("Connected to cluster using in-cluster config");
} catch {
  fastify.log.info(
    "In-cluster config unavailable, falling back to local kubeconfig",
  );
}

await fastify.listen({ port: 3001, host: "0.0.0.0" });

export default fastify;
