import { create } from 'zustand';

const TOKEN_KEY = 'brooks_admin_token';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  is_owner: boolean;
}

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  setSession: (token: string, user: AdminUser) => void;
  setUser: (user: AdminUser) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, user });
  },
  setUser: (user) => set({ user }),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },
}));

export const getToken = () => localStorage.getItem(TOKEN_KEY);
