import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type UserRole = 'admin' | 'user' | null;

interface AuthState {
  token: string | null;
  role: UserRole;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,

      login: (username, password) => {
        // 模拟后端验证逻辑
        if (username === 'admin' && password === '123456') {
          set({ token: 'admin-token', role: 'admin' });
          return true;
        }

        if (username === 'user' && password === '123456') {
          set({ token: 'user-token', role: 'user' });
          return true;
        }

        return false;
      },

      logout: () => {
        set({ token: null, role: null });
      },
    }),
    {
      name: 'enterprise-auth-storage', // 存储在 localStorage 的 key
      storage: createJSONStorage(() => localStorage),
    }
  )
);