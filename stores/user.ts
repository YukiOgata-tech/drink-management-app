import { create } from 'zustand';
import { User } from '@/types';
import { signOut as authSignOut, getCurrentSession } from '@/lib/auth';

interface UserState {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  hasAgreedToConsent: boolean;
  setUser: (user: User | null, isGuest?: boolean) => void;
  updateProfile: (profile: Partial<User['profile']>) => void;
  agreeToConsent: () => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setAsGuest: () => void;
}

// ゲストユーザーの作成
const createGuestUser = (): User => ({
  id: `guest-${Date.now()}`,
  email: '',
  emailConfirmed: false,
  displayName: 'ゲストユーザー',
  profile: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isGuest: false,
  isLoading: true,
  hasAgreedToConsent: false,

  setUser: (user, isGuest = false) => set({ user, isGuest, isLoading: false }),

  updateProfile: (profile) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            profile: { ...state.user.profile, ...profile },
            updatedAt: new Date().toISOString(),
          }
        : null,
    })),

  agreeToConsent: () => set({ hasAgreedToConsent: true }),

  logout: async () => {
    const { error } = await authSignOut();
    if (!error) {
      set({ user: null, isGuest: false });
    }
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    const { user, error } = await getCurrentSession();

    if (user && !error) {
      // 認証済みユーザー
      set({ user, isGuest: false, isLoading: false });
    } else {
      // ゲストモード
      set({ user: createGuestUser(), isGuest: true, isLoading: false });
    }
  },

  setAsGuest: () => {
    set({ user: createGuestUser(), isGuest: true, isLoading: false });
  },
}));
