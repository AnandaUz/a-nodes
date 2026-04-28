import type { INode } from "@shared/types";

export const NODE_EVENTS = {
    Created: 'node:created',
    Updated: 'node:updated',
    Moved:   'node:moved',
    Deleted: 'node:deleted',
} as const; // as const делает поля только для чтения

// Тип для использования в коде (аналог Enum)
export type NodeEvent = typeof NODE_EVENTS[keyof typeof NODE_EVENTS];


export type DeskEvents = {
    [NODE_EVENTS.Created]:      INode;
    [NODE_EVENTS.Updated]:      INode;
    [NODE_EVENTS.Moved]:        INode;
    [NODE_EVENTS.Deleted]:      { id: string };    
};