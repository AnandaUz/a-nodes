import { describe, it, expect, vi } from "vitest";
import { SSEService, type SSEClient } from "../sse.service";
import type { Response } from "express";

const createMockResponse = (): Response => {
  return {
    write: vi.fn(),
  } as unknown as Response;
};

describe("SSEService", () => {
  it("подключает клиента к комнате и отключает при вызове отписки", () => {
    const sse = new SSEService();
    const res = createMockResponse();
    const client: SSEClient = { id: "c1", clientId: "client-a", res };

    const unsubscribe = sse.subscribe("desk-1", client);
    expect(sse.getClientCount("desk-1")).toBe(1);

    unsubscribe();
    expect(sse.getClientCount("desk-1")).toBe(0);
  });

  it("рассылает события только клиентам указанного деска", () => {
    const sse = new SSEService();
    const res1 = createMockResponse();
    const res2 = createMockResponse();

    sse.subscribe("desk-1", { id: "c1", clientId: "client-1", res: res1 });
    sse.subscribe("desk-2", { id: "c2", clientId: "client-2", res: res2 });

    const payload = { type: "nodes_updated", serverTime: "2026-11-03T10:00:00Z" };
    sse.broadcastToDesk("desk-1", payload);

    expect(res1.write).toHaveBeenCalledWith(`data: ${JSON.stringify(payload)}\n\n`);
    expect(res2.write).not.toHaveBeenCalled();
  });

  it("исключает клиента-инициатора по excludeClientId (sender suppression)", () => {
    const sse = new SSEService();
    const resSender = createMockResponse();
    const resReceiver = createMockResponse();

    sse.subscribe("desk-1", { id: "c1", clientId: "sender-123", res: resSender });
    sse.subscribe("desk-1", { id: "c2", clientId: "other-456", res: resReceiver });

    const payload = { type: "nodes_updated", senderId: "sender-123" };
    sse.broadcastToDesk("desk-1", payload, "sender-123");

    expect(resSender.write).not.toHaveBeenCalled();
    expect(resReceiver.write).toHaveBeenCalledWith(`data: ${JSON.stringify(payload)}\n\n`);
  });
});

