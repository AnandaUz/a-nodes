import { Schema, model, Document } from 'mongoose';
import { IUser, IGoal } from '@shared/types';

export interface IUserDocument extends IUser, Document {}

// 1. Схема для целей (IGoal)
const goalSchema = new Schema<IGoal>({
    title: {
        type: String,
        required: true
    },
    endDate: {
        type: Date
    },
    startDate: {
        type: Date
    },
    startWeight: {
        type: Number
    },
    targetWeight: {
        type: Number
    }
});

// 2. Описываем схему: это правила, по которым данные ложатся в саму MongoDB.
// Даже если TS пропустит ошибку, Mongoose на этом этапе её остановит.
const userSchema = new Schema<IUserDocument>({
    googleId: {
        type: String,
        required: true,
        unique: true, // База не даст создать двух юзеров с одинаковым ID
        trim: true    // Удалит лишние пробелы по краям
    },
    isRegistered: {
        type: Boolean,
        default: false
    },
    telegramId: {
        type: Number
    },
    token: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now // Проставит дату создания автоматически
    },
    name: {
        type: String,
        required: true
    },
    settings: {
        account: {
            weightStart: {
                type: Number
            }
        },
        privacy: {
            showMyPage: {
                type: Boolean,
                default: false
            }
        },
        goals: [goalSchema]
    }
});

// 3. Создаем модель: это "пульт управления" коллекцией пользователей.
export const User = model<IUserDocument>('users', userSchema);