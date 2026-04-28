import type { IUser } from '@shared/types';
import { fetchWithAuth } from './api';

let cache: IUser[] | null = null;
export async function getUsers(): Promise<IUser[]> {

  if (cache) return cache;

  const response = await fetchWithAuth(`/api/users`);

  if (!response.ok) {
    throw new Error(`Ошибка сервера: ${response.status}`);
  }

  cache = await response.json() as IUser[];
  return cache;
}