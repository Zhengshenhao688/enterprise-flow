import { create } from 'zustand';

type UserRole = 'admin' | 'user' | null;

interface AuthState {
  token: string | null;
  role: UserRole;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  role: (localStorage.getItem('role') as UserRole) || null,

  // 简单模拟登录逻辑
  login: (username, password) => {
    if (username === 'admin' && password === '123456') {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('role', 'admin');
      set({ token: 'admin-token', role: 'admin' });
      return true;
    }

    if (username === 'user' && password === '123456') {
      localStorage.setItem('token', 'user-token');
      localStorage.setItem('role', 'user');
      set({ token: 'user-token', role: 'user' });
      return true;
    }

    return false;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    set({ token: null, role: null });
  },
}));