import { WebSocket } from "@fastify/websocket";
import { ClusterService } from "../cluster/cluster.service.js";
import { ResourceEvent } from "../cluster/cluster.types.js";

const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export class WsGateway {
  private clients: Set<WebSocket> = new Set();

  constructor(private clusterService: ClusterService) {
    this.subscribeToClusterEvents();
  }

  private subscribeToClusterEvents(): void {
    this.clusterService.on("resource.event", (event: ResourceEvent) => {
      this.broadcast({
        type: `resource.${event.type.toLowerCase()}`, // resource.added / resource.modified / resource.deleted
        resourceType: event.resourceType,
        resource: event.resource,
      });
    });

    this.clusterService.on("connection.status", (data: { status: string }) => {
      this.broadcast({ type: "connection.status", ...data });
    });

    this.clusterService.on(
      "watch.error",
      (data: { resourceType: string; error: string }) => {
        this.broadcast({ type: "watch.error", ...data });
      },
    );

    this.clusterService.on("namespace.changed", () => {
      for (const client of this.clients) {
        this.sendSnapshot(client);
      }
    });
  }

  handleConnection(socket: WebSocket): void {
    this.clients.add(socket);
    console.log(`[WS] Client connected. Total: ${this.clients.size}`);

    this.sendToClient(socket, {
      type: "connection.status",
      status: this.clusterService.isConnected() ? "connected" : "disconnected",
    });

    if (this.clusterService.isConnected()) {
      this.sendSnapshot(socket);
    }

    socket.on("message", (raw: Buffer) => {
      this.handleMessage(socket, raw.toString());
    });

    socket.on("close", () => {
      this.clients.delete(socket);
      console.log(`[WS] Client disconnected. Total: ${this.clients.size}`);
    });

    socket.on("error", (err: Error) => {
      console.error("[WS] Socket error:", err.message);
      this.clients.delete(socket);
    });
  }

  private handleMessage(socket: WebSocket, raw: string): void {
    try {
      const message = JSON.parse(raw);

      if (message.type === "ping") {
        this.sendToClient(socket, { type: "pong" });
      }
    } catch {
      console.warn("[WS] Invalid message received:", raw);
    }
  }

  private async sendSnapshot(socket: WebSocket): Promise<void> {
    try {
      const namespace = this.clusterService.getCurrentNamespace();
      const snapshot = await this.clusterService.getSnapshot(namespace);

      this.sendToClient(socket, {
        type: "snapshot",
        data: snapshot,
      });
    } catch (err: any) {
      this.sendToClient(socket, {
        type: "error",
        message: `Failed to get snapshot: ${err.message}`,
      });
    }
  }

  private broadcast(payload: object): void {
    const message = JSON.stringify(payload);

    for (const client of this.clients) {
      if (client.readyState === WS_READY_STATE.OPEN) {
        client.send(message);
      } else {
        this.clients.delete(client);
      }
    }
  }

  private sendToClient(socket: WebSocket, payload: object): void {
    if (socket.readyState === WS_READY_STATE.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}
