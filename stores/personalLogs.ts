import { create } from 'zustand';
import { PersonalDrinkLog, PersonalLogSyncStatus } from '@/types';
import {
  getPersonalLogs,
  addPersonalLog as addPersonalLogStorage,
  updatePersonalLog as updatePersonalLogStorage,
  deletePersonalLog as deletePersonalLogStorage,
  getTodayPersonalLogs,
  getPersonalLogsByDateRange,
  markLogAsSynced,
  getPendingSyncLogs,
  hasLocalRecordToday,
  replaceLogsWithSupabase,
  clearAllPersonalLogs,
} from '@/lib/storage/personalLogs';
import {
  createPersonalLogInSupabase,
  fetchPersonalLogsFromSupabase,
  deletePersonalLogFromSupabase,
  hasRecordedToday as hasRecordedTodayApi,
} from '@/lib/personal-logs-api';
import { useUserStore } from './user';
import { XP_VALUES } from '@/lib/xp';
import { addNegativeXP } from '@/lib/xp-api';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface PersonalLogsState {
  logs: PersonalDrinkLog[];
  isLoaded: boolean;
  isLoading: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;

  // Actions
  loadLogs: () => Promise<void>;
  addLog: (log: Omit<PersonalDrinkLog, 'syncStatus' | 'supabaseId'>) => Promise<{ leveledUp: boolean; newLevel?: number; debtPaid: number }>;
  updateLog: (id: string, updates: Partial<PersonalDrinkLog>) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  // ソフトデリート関連
  softDeleteLog: (id: string) => Promise<void>;
  restoreLog: (id: string) => Promise<void>;
  permanentlyDeleteLog: (id: string) => Promise<void>;
  getTodayLogs: () => Promise<PersonalDrinkLog[]>;
  getLogsByDateRange: (startDate: string, endDate: string) => Promise<PersonalDrinkLog[]>;

  // Sync Actions
  syncToSupabase: () => Promise<void>;
  fetchFromSupabase: () => Promise<void>;
  clearLogs: () => Promise<void>;
}

export const usePersonalLogsStore = create<PersonalLogsState>((set, get) => ({
  logs: [],
  isLoaded: false,
  isLoading: false,
  syncStatus: 'idle' as SyncStatus,
  syncError: null,

  loadLogs: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const logs = await getPersonalLogs();
      set({ logs, isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
  },

  addLog: async (logInput) => {
    const userState = useUserStore.getState();
    const isAuthenticated = !userState.isGuest && userState.user;

    // デフォルトの同期状態を設定
    const log: PersonalDrinkLog = {
      ...logInput,
      syncStatus: isAuthenticated ? 'pending' : 'local',
    };

    // ローカルに即座に保存
    await addPersonalLogStorage(log);

    let leveledUp = false;
    let newLevel: number | undefined;
    let debtPaid = 0;

    // 認証ユーザーの場合はSupabaseにも同期
    if (isAuthenticated && userState.user) {
      try {
        // 当日初回記録かチェック（XPボーナス判定用）
        const { hasRecorded } = await hasRecordedTodayApi(userState.user.id);
        const isFirstOfDay = !hasRecorded;

        // Supabaseに保存
        const { supabaseId, error } = await createPersonalLogInSupabase(log, userState.user.id);

        if (supabaseId && !error) {
          // 同期成功 - ローカルを更新
          await markLogAsSynced(log.id, supabaseId);

          // XP付与
          const xpAmount = isFirstOfDay
            ? XP_VALUES.DRINK_LOG + XP_VALUES.DAILY_BONUS
            : XP_VALUES.DRINK_LOG;

          const xpResult = await userState.addXP(xpAmount, 'drink_log');
          leveledUp = xpResult.leveledUp;
          newLevel = xpResult.newLevel;
          debtPaid = xpResult.debtPaid;
        }
      } catch (error) {
        console.error('Error syncing to Supabase:', error);
        // エラーでもローカルには保存されている
      }
    }

    // ステートを更新
    const logs = await getPersonalLogs();
    set({ logs });

    return { leveledUp, newLevel, debtPaid };
  },

  updateLog: async (id, updates) => {
    await updatePersonalLogStorage(id, updates);
    const logs = await getPersonalLogs();
    set({ logs });
  },

  deleteLog: async (id) => {
    const log = get().logs.find((l) => l.id === id);
    const userState = useUserStore.getState();

    // Supabaseからも削除
    if (log?.supabaseId) {
      try {
        await deletePersonalLogFromSupabase(log.supabaseId);

        // 認証ユーザーの場合、借金XPを追加（同期済みの記録のみ）
        if (!userState.isGuest && userState.user) {
          await addNegativeXP(userState.user.id, XP_VALUES.DRINK_LOG);
          // ユーザーストアのXP情報を更新
          await userState.refreshXP();
        }
      } catch (error) {
        console.error('Error deleting from Supabase:', error);
      }
    }

    await deletePersonalLogStorage(id);
    const logs = await getPersonalLogs();
    set({ logs });
  },

  // ソフトデリート: deletedAtを設定するだけ（即座に消えない）
  softDeleteLog: async (id) => {
    await updatePersonalLogStorage(id, { deletedAt: new Date().toISOString() });
    const logs = await getPersonalLogs();
    set({ logs });
  },

  // 復元: deletedAtを削除
  restoreLog: async (id) => {
    await updatePersonalLogStorage(id, { deletedAt: undefined });
    const logs = await getPersonalLogs();
    set({ logs });
  },

  // 完全削除: Supabase削除 + ローカル削除 + XP借金
  permanentlyDeleteLog: async (id) => {
    const log = get().logs.find((l) => l.id === id);
    const userState = useUserStore.getState();

    // Supabaseからも削除
    if (log?.supabaseId) {
      try {
        await deletePersonalLogFromSupabase(log.supabaseId);

        // 認証ユーザーの場合、借金XPを追加（同期済みの記録のみ）
        if (!userState.isGuest && userState.user) {
          await addNegativeXP(userState.user.id, XP_VALUES.DRINK_LOG);
          await userState.refreshXP();
        }
      } catch (error) {
        console.error('Error deleting from Supabase:', error);
      }
    }

    await deletePersonalLogStorage(id);
    const logs = await getPersonalLogs();
    set({ logs });
  },

  getTodayLogs: async () => {
    return getTodayPersonalLogs();
  },

  getLogsByDateRange: async (startDate, endDate) => {
    return getPersonalLogsByDateRange(startDate, endDate);
  },

  // 同期関連
  syncToSupabase: async () => {
    const userState = useUserStore.getState();
    if (userState.isGuest || !userState.user) return;

    set({ syncStatus: 'syncing', syncError: null });

    try {
      const pendingLogs = await getPendingSyncLogs();

      for (const log of pendingLogs) {
        const { supabaseId, error } = await createPersonalLogInSupabase(log, userState.user.id);

        if (supabaseId && !error) {
          await markLogAsSynced(log.id, supabaseId);
        }
      }

      const logs = await getPersonalLogs();
      set({ logs, syncStatus: 'idle' });
    } catch (error: any) {
      set({ syncStatus: 'error', syncError: error.message || 'Sync failed' });
    }
  },

  fetchFromSupabase: async () => {
    const userState = useUserStore.getState();
    if (userState.isGuest || !userState.user) return;

    set({ syncStatus: 'syncing', syncError: null });

    try {
      const { logs: supabaseLogs, error } = await fetchPersonalLogsFromSupabase(userState.user.id);

      if (error) {
        throw new Error(error.message);
      }

      // Supabaseの記録でローカルを置き換え
      await replaceLogsWithSupabase(supabaseLogs);

      set({ logs: supabaseLogs, syncStatus: 'idle' });
    } catch (error: any) {
      set({ syncStatus: 'error', syncError: error.message || 'Fetch failed' });
    }
  },

  clearLogs: async () => {
    await clearAllPersonalLogs();
    set({ logs: [], isLoaded: false });
  },
}));
