import { z } from 'zod';

export const createUserSchema = z.object({
    body: z.object({
        googleId: z.string().min(1, "ID обязателен"),
        isRegistered: z.boolean().optional(),
        telegramId: z.number().optional(),
        token: z.string().optional(),
        name: z.string().min(2, "Имя слишком короткое"),
        settings: z.object({
            account: z.object({
                weightStart: z.number().optional(),
            }),
            privacy: z.object({
                showMyPage: z.boolean().default(false),
            }).optional(),
            goals: z.array(z.object({
                title: z.string().min(1),
                endDate: z.date().optional(),
                startDate: z.date().optional(),
                startWeight: z.number().optional(),
                targetWeight: z.number().optional(),
            })).optional(),
        }),
    }),
});