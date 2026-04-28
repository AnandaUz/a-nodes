import { Request, Response } from 'express';
import { User } from '../models/User';
import { createUserSchema } from "../schemas/user.schema"; // проверь путь до своей модели

export const createUser = async (req: Request, res: Response) => {
    try {
        // 1. Валидация (проверка) входящих данных
        const validatedData = createUserSchema.parse(req.body);

        // 2. Создание записи из проверенных данных
        const newUser = new User(validatedData.body);

        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (error: any) {
        // Если Zod найдет ошибку, он "выбросит" её сюда
        res.status(400).json({ error: error.errors || "Ошибка валидации" });
    }
};
export const getAllUsers = async (_req: Request, res: Response) => {
    try {
        const users = await User.find({}).select('-__v').lean();
        const mappedUsers = users.map((u: any) => {
            const { _id, ...rest } = u;
            return { id: _id, ...rest };
        });
        res.status(200).json(mappedUsers);
    } catch (error) {
        res.status(500).json({ message: "Не удалось получить пользователей", error });
    }
};
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Берем ID из URL: /api/users/123...

        const user = await User.findById(id).lean();

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const { _id, ...rest } = user as any;
        res.json({ id: _id, ...rest });
    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера", error });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { settings } = req.body; // Фронтенд пришлет объект с изменениями

        // Мы обновляем только поле settings.
        // { new: true } — возвращает уже обновленный документ.
        // { runValidators: true } — проверяет данные на соответствие схеме (enum, типы).
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: { settings: settings } },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        res.json(updatedUser.settings);
    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        res.status(500).json({ message: "Ошибка на сервере", error });
    }
};