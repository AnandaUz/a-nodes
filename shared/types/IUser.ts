export interface IUser {
  id: string;
  googleId: string;
  isRegistered?: boolean;
  token?: string;
  refreshTokenHash?: string;
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
