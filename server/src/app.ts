import Fastify, { type FastifyError } from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import { join } from "path";
import { fileURLToPath } from "url";
import { clusterRoutes } from "./cluster/cluster.routes.js";
import { WsGateway } from "./gateway/ws.gateway.js";
import { ClusterService } from "./cluster/cluster.service.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const fastify = Fastify({ logger: true });

// --- Plugins ---
await fastify.register(cors, {
  origin: ["http://localhost:5174", "http://localhost:3001"],
});
await fastify.register(websocket);
await fastify.register(multipart);
await fastify.register(staticFiles, {
  root: join(__dirname, "..", "public"),
  prefix: "/",
  decorateReply: false,
});

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

// SPA fallback — serve index.html for all non-API routes
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith("/api") || request.url.startsWith("/ws")) {
    reply.code(404).send({ error: "Not found" });
    return;
  }
  reply.sendFile("index.html");
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
  fastify.log.info("Connected via in-cluster config");
} catch {
  try {
    fastify.clusterService.connectFromDefault();
    fastify.log.info("Connected via local kubeconfig");
  } catch {
    fastify.log.info(
      "No cluster config found — waiting for kubeconfig upload via UI",
    );
  }
}

await fastify.listen({ port: 3001, host: "0.0.0.0" });

export default fastify;
