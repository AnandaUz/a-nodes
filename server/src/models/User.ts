import { Schema, model, Document } from "mongoose";
import { IUser } from "../../../shared/types/IUser";

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>({
  googleId: {
    type: String,
    required: true,
    unique: true, // База не даст создать двух юзеров с одинаковым ID
    trim: true, // Удалит лишние пробелы по краям
  },
  isRegistered: {
    type: Boolean,
    default: false,
  },
  telegramId: {
    type: Number,
  },
  token: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Проставит дату создания автоматически
  },
  name: {
    type: String,
    required: true,
  },
  settings: {
    homeId: {
      type: String,
    },
  },
});

// 3. Создаем модель: это "пульт управления" коллекцией пользователей.
export const User = model<IUserDocument>("users", userSchema);
