import { create } from 'zustand';
import type { User } from '../lib/types';
interface AuthState {
  user: User | null;
  accessToken: string | null;
  setSession: (user: User, token: string) => void;
  setToken: (token: string) => void;
  clear: () => void;
}
// Tokens are deliberately kept in memory, never persisted to localStorage.
export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  setToken: (accessToken) => set({ accessToken }),
  clear: () => set({ user: null, accessToken: null }),
}));
export const demoUser: User = {
  id: 'demo-sofia',
  name: 'Sofía García',
  email: 'sofia@example.com',
  role: 'customer',
};
