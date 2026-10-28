export interface IUser {
  id: string;
  googleId: string;
  telegramId?: number;
  isRegistered?: boolean;
  token?: string;
  createdAt: Date;
  email?: string;
  picture?: string;
  name: string;
  isAdmin?: boolean;
  lastActiveAt?: Date | string;
  pageViewsCount?: number;
  settings?: {
    homeId?: string;
  };
}
