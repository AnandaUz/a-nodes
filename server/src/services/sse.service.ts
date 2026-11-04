import type { Response } from "express";

export interface SSEClient {
  id: string;
  clientId?: string | undefined;
  userId?: string | undefined;
  res: Response;
}

export class SSEService {
  private rooms = new Map<string, Set<SSEClient>>();

  /**
   * Подключение клиента к SSE-комнате деска
   */
  subscribe(deskId: string, client: SSEClient): () => void {
    const normalizedDeskId = deskId || "root";
    let room = this.rooms.get(normalizedDeskId);
    if (!room) {
      room = new Set();
      this.rooms.set(normalizedDeskId, room);
    }
    room.add(client);

    return () => {
      room.delete(client);
      if (room.size === 0) {
        this.rooms.delete(normalizedDeskId);
      }
    };
  }

  /**
   * Рассылка события всем клиентам комнаты деска, кроме отправителя (senderId)
   */
  broadcastToDesk(
    deskId: string,
    event: Record<string, any>,
    excludeClientId?: string,
  ): void {
    const normalizedDeskId = deskId || "root";
    const room = this.rooms.get(normalizedDeskId);
    if (!room || room.size === 0) return;

    const payload = `data: ${JSON.stringify(event)}\n\n`;

    for (const client of room) {
      if (
        excludeClientId &&
        client.clientId &&
        client.clientId === excludeClientId
      ) {
        continue;
      }
      try {
        client.res.write(payload);
      } catch (err) {
        console.warn(`[SSEService] Ошибка отправки клиенту ${client.id}:`, err);
      }
    }
  }

  /**
   * Число активных клиентов деска
   */
  getClientCount(deskId: string): number {
    return this.rooms.get(deskId || "root")?.size ?? 0;
  }
}

export const sseService = new SSEService();
