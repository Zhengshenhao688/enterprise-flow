import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 类型放宽，允许任意字符串作为角色
type UserRole = 'admin' | string | null;

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
        // 1. 密码校验
        if (password === '123456') {
          // 2. ⭐ 核心修复：标准化处理
          // 输入 "Manager " -> 存为 "manager"
          // 输入 "HR"       -> 存为 "hr"
          const normalizedRole = username.trim().toLowerCase(); 
          
          set({ 
            token: `mock-token-${normalizedRole}`, 
            role: normalizedRole 
          });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ token: null, role: null });
      },
    }),
    {
      name: 'enterprise-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);