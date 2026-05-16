import type { WsMessage } from "../types/cluster.types";

type MessageHandler = (message: WsMessage) => void;

class WsClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private url: string = "ws://localhost:3001/ws";

  connect(): void {
    this.shouldReconnect = true;
    this.createConnection();
  }

  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.ws?.close();
    this.ws = null;
  }

  private createConnection(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] Connected");
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        this.handlers.forEach((handler) => handler(message));
      } catch {
        console.warn("[WS] Invalid message:", event.data);
      }
    };

    this.ws.onclose = () => {
      console.log("[WS] Disconnected");
      this.handlers.forEach((h) =>
        h({ type: "connection.status", status: "disconnected" })
      );
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error("[WS] Error:", err);
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    console.log("[WS] Reconnecting in 3s...");
    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, 3000);
  }

  private startPing(): void {
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

export const wsClient = new WsClient();
