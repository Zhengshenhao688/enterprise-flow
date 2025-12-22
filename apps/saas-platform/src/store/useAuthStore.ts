import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 用户角色类型
 * 放宽限制，允许从用户名动态推导角色字符串
 */
export type UserRole = 'admin' | string | null; 

interface AuthState {
  token: string | null;
  role: UserRole ;
  login: (username: string, password: string) => boolean;
  logout: () => void;
} 

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,

      /**
       * 登录方法
       * ⭐ 核心逻辑：执行角色标准化处理
       */
      login: (username, password) => {
        // 1. 简易密码校验（演示用途）
        if (password === '123456') { 
          
          // 2. ⭐ 核心修复：标准化处理 (Step 2)
          // 目的：确保识别到的角色与设计器 PropertiesPanel 中配置的 Role Key 完全对等。
          const normalizedRole = username.trim().toLowerCase(); 
          
          set({ 
            token: `mock-token-${normalizedRole}`, 
            role: normalizedRole // 存入 Store 的 role 永远是标准化的
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
      storage: createJSONStorage(() => localStorage), // 持久化存储在 localStorage
    }
  )
);

