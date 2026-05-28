import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: 'OPS_ADMIN' | 'SUPER_ADMIN' | 'OPS_VIEWER';
  avatar?: string;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  shockMode: {
    active: boolean;
    level: number;
    reason: string;
  };
  notificationCount: number;
  sidebarCollapsed: boolean;

  setUser: (user: User | null) => void;
  initAuth: () => void;
  setShockMode: (active: boolean, level?: number, reason?: string) => void;
  setNotificationCount: (count: number) => void;
  toggleSidebar: () => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  shockMode: {
    active: false,
    level: 0,
    reason: '',
  },
  notificationCount: 0,
  sidebarCollapsed: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  initAuth: () => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('opsUser');
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        set({ user, isAuthenticated: true });
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('opsUser');
      }
    }
  },
  setShockMode: (active, level = 0, reason = '') => set({ shockMode: { active, level, reason } }),
  setNotificationCount: (count) => set({ notificationCount: count }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('opsUser');
    set({ user: null, isAuthenticated: false });
  },
}));