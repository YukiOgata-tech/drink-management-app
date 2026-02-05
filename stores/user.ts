import { create } from 'zustand';
import { User, XPSource, UserXP } from '@/types';
import { signOut as authSignOut, getCurrentSession } from '@/lib/auth';
import { updateProfile as dbUpdateProfile, getProfile, getUserWithProfile } from '@/lib/database';
import { addXPToProfile, fetchUserXP } from '@/lib/xp-api';
import { getXPInfo } from '@/lib/xp';

interface UserState {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  hasAgreedToConsent: boolean;
  setUser: (user: User | null, isGuest?: boolean) => void;
  updateProfile: (profile: Partial<User['profile']>) => Promise<{ error: any | null }>;
  refreshProfile: () => Promise<void>;
  agreeToConsent: () => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setAsGuest: () => void;
  // XP関連
  addXP: (amount: number, source: XPSource) => Promise<{ leveledUp: boolean; newLevel?: number; debtPaid: number; error: any | null }>;
  getXPInfo: () => UserXP;
  refreshXP: () => Promise<void>;
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

  updateProfile: async (profile) => {
    const state = get();

    // ゲストユーザーの場合はローカルのみ更新
    if (state.isGuest || !state.user) {
      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              profile: { ...state.user.profile, ...profile },
              updatedAt: new Date().toISOString(),
            }
          : null,
      }));
      return { error: null };
    }

    // 認証済みユーザーの場合はデータベースに保存
    const { error } = await dbUpdateProfile(state.user.id, profile);

    if (error) {
      return { error };
    }

    // ローカルステートも更新
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            profile: { ...state.user.profile, ...profile },
            updatedAt: new Date().toISOString(),
          }
        : null,
    }));

    return { error: null };
  },

  refreshProfile: async () => {
    const state = get();

    if (state.isGuest || !state.user) {
      return;
    }

    // データベースから最新のプロフィールを取得
    const { user, error } = await getUserWithProfile(state.user.id);

    if (user && !error) {
      set({ user });
    }
  },

  agreeToConsent: () => set({ hasAgreedToConsent: true }),

  logout: async () => {
    const { error } = await authSignOut();
    if (!error) {
      // ログアウト後はゲストユーザーとして設定
      set({ user: createGuestUser(), isGuest: true, isLoading: false });
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

  // XP関連
  addXP: async (amount, source) => {
    const state = get();

    // ゲストユーザーはXP付与なし
    if (state.isGuest || !state.user) {
      return { leveledUp: false, debtPaid: 0, error: null };
    }

    // Supabaseに保存
    const { data, error } = await addXPToProfile(state.user.id, amount, source);

    if (error || !data) {
      return { leveledUp: false, debtPaid: 0, error };
    }

    // ローカルステートも更新
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            profile: {
              ...state.user.profile,
              totalXP: data.totalXP,
              level: data.level,
              negativeXP: data.negativeXP,
            },
          }
        : null,
    }));

    return {
      leveledUp: data.leveledUp,
      newLevel: data.newLevel,
      debtPaid: data.debtPaid,
      error: null,
    };
  },

  getXPInfo: () => {
    const state = get();
    const totalXP = state.user?.profile?.totalXP ?? 0;
    const negativeXP = state.user?.profile?.negativeXP ?? 0;
    return getXPInfo(totalXP, negativeXP);
  },

  refreshXP: async () => {
    const state = get();

    if (state.isGuest || !state.user) {
      return;
    }

    const { xpInfo, error } = await fetchUserXP(state.user.id);

    if (xpInfo && !error) {
      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              profile: {
                ...state.user.profile,
                totalXP: xpInfo.totalXP,
                level: xpInfo.level,
                negativeXP: xpInfo.negativeXP,
              },
            }
          : null,
      }));
    }
  },
}));
