import type { Response } from 'express';
import { Node } from '../models/Node';
import type { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';

// ─── GET /api/desk/root ───────────────────────────────────────────
// Корневой уровень — все ноды у которых parentId = null
// export const getRootDesk = async (req: AuthRequest, res: Response) => {
//     try {
//         const ownerId = req.user!.id;

//          Node.find({ ownerId, parentId: null } as any),
//             DeskConnector.find({ ownerId, deskId: 'root' } as any),
//         ]);

//         res.json({ nodes, connectors });
//     } catch (err: any) {
//         console.error('[getRootDesk Error]:', err);
//         res.status(500).json({ message: 'Ошибка загрузки корневого desk', error: err?.message });
//     }
// };

// ─── GET /api/desk/:nodeId ────────────────────────────────────────
// Вложенный уровень — все ноды у которых parentId = :nodeId
export const getNodesByParentNodeId = async (req: AuthRequest, res: Response) => {
    try {
        const ownerId = req.user!.id;
        const nodeId = req.params['nodeId'];

        // Создаем массив для поиска, исключая undefined
        let parentId: string | null = null;
        if (typeof nodeId === 'string' && nodeId !== 'root') {
            parentId = nodeId;
        }

        const nodes = await Node.find({
            ownerId,
            parentId: { $in: [null, parentId] }
        });

        res.json({ nodes })        
    } catch (err: any) {
        console.error('[getDeskByNodeId Error]:', err);
        res.status(500).json({ message: 'Ошибка загрузки desk', error: err?.message });
    }
};
export const saveNodes = async (req: AuthRequest, res: Response) => {
    try {
        const ownerId = req.user!.id;
        const { nodes } = req.body; // Ожидаем массив нод в теле запроса

        if (!Array.isArray(nodes)) {
            return res.status(400).json({ message: 'Ожидался массив нод' });
        }

        // Формируем операции для bulkWrite
        const operations = nodes.map((node: any) => ({
            updateOne: {
                // Критерий поиска: ищем по _id и ownerId (для безопасности)
                filter: { 
                    _id: node._id || new mongoose.Types.ObjectId(), 
                    ownerId 
                },
                // Что обновляем:
                update: { 
                    $set: { 
                        ...node, 
                        ownerId // Принудительно ставим текущего владельца
                    } 
                },
                // Магия: если не найдено — создать
                upsert: true 
            }
        }));

        const result = await Node.bulkWrite(operations);

        res.json({ 
            message: 'Сохранение завершено', 
            matched: result.matchedCount,
            upserted: result.upsertedCount,
            modified: result.modifiedCount
        });
        
    } catch (err: any) {
        console.error('[saveNodes Error]:', err);
        res.status(500).json({ message: 'Ошибка сохранения нод', error: err?.message });
    }
};

// ─── PUT /api/desk/:deskId ────────────────────────────────────────
// Сохраняем весь снапшот desk'а — заменяем ноды и коннекторы
export const saveDesk = async (req: AuthRequest, res: Response) => {
    try {
        const ownerId = req.user!.id;
        const deskId = req.params['deskId'];

        if (!deskId) {
            res.status(400).json({ message: 'Не указан ID стола' });
            return;
        }

        const { nodes } = req.body as {
            nodes:      Array<{ id: string; x: number; y: number; width: number; height: number; text: string; type: string }>;
            // connectors: Array<{ id: string; fromId: string; toId: string }>;
        };

        const parentId = deskId === 'root' ? null : deskId;

        if (nodes && nodes.length > 0) {
            await Node.insertMany(
                nodes.map(n => ({
                    _id:      n.id,
                    ownerId,
                    ...(parentId !== null ? { parentId } : {}),
                    type:     n.type || 'default',
                    x:        n.x,
                    y:        n.y,
                    width:    n.width,
                    height:   n.height,
                    text:     n.text,
                })) as any[]
            );
        }        

        res.json({ ok: true });
    } catch (err: any) {
        console.error('[saveDesk Error]:', err);
        res.status(500).json({ 
            message: 'Ошибка сохранения desk', 
            error: err?.message || String(err)
        });
    }
};
