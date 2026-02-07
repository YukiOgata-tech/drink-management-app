import { create } from 'zustand';
import { DrinkLog, DefaultDrink, Memo } from '@/types';
import { dummyDrinkLogs, dummyMemos } from '@/data/dummy_data';
import defaultDrinksData from '@/data/default_drinks.json';
import * as DrinkLogsAPI from '@/lib/drink-logs';
import dayjs from 'dayjs';

interface DrinksState {
  drinkLogs: DrinkLog[];
  todayLogs: DrinkLog[];
  memos: Memo[];
  defaultDrinks: DefaultDrink[];
  loading: boolean;

  // Supabaseからデータ取得
  fetchTodayLogs: (userId: string) => Promise<void>;
  fetchDrinkLogsByEvent: (eventId: string) => Promise<DrinkLog[]>;

  // ローカル操作（レガシー）
  addDrinkLog: (log: DrinkLog) => void;
  updateDrinkLog: (id: string, updates: Partial<DrinkLog>) => void;
  deleteDrinkLog: (id: string) => void;
  getDrinkLogsByEvent: (eventId: string) => DrinkLog[];
  getDrinkLogsByUser: (userId: string, eventId?: string) => DrinkLog[];
  getTodayDrinkLogs: (userId: string) => DrinkLog[];
  addMemo: (memo: Memo) => void;
  getMemosByEvent: (eventId: string) => Memo[];
  getDefaultDrinkById: (id: string) => DefaultDrink | undefined;
  searchDefaultDrinks: (query: string) => DefaultDrink[];
}

export const useDrinksStore = create<DrinksState>((set, get) => ({
  drinkLogs: dummyDrinkLogs,
  todayLogs: [],
  memos: dummyMemos,
  defaultDrinks: defaultDrinksData as DefaultDrink[],
  loading: false,

  // Supabaseから今日の飲酒記録を取得
  fetchTodayLogs: async (userId: string) => {
    set({ loading: true });
    try {
      const { drinkLogs, error } = await DrinkLogsAPI.getDrinkLogsByUser(userId);

      if (error) {
        console.error('Error fetching today logs:', error);
        set({ loading: false });
        return;
      }

      // 今日の日付でフィルタリング
      const today = dayjs().format('YYYY-MM-DD');
      const todayLogs = drinkLogs.filter(
        (log) => dayjs(log.recordedAt).format('YYYY-MM-DD') === today
      );

      set({ todayLogs, loading: false });
    } catch (err) {
      console.error('Error fetching today logs:', err);
      set({ loading: false });
    }
  },

  // Supabaseからイベントの飲酒記録を取得
  fetchDrinkLogsByEvent: async (eventId: string) => {
    const { drinkLogs, error } = await DrinkLogsAPI.getDrinkLogsByUser('', eventId);
    if (error) {
      console.error('Error fetching event drink logs:', error);
      return [];
    }
    return drinkLogs;
  },

  addDrinkLog: (log) =>
    set((state) => ({ drinkLogs: [...state.drinkLogs, log] })),

  updateDrinkLog: (id, updates) =>
    set((state) => ({
      drinkLogs: state.drinkLogs.map((log) =>
        log.id === id
          ? { ...log, ...updates, updatedAt: new Date().toISOString() }
          : log
      ),
    })),

  deleteDrinkLog: (id) =>
    set((state) => ({
      drinkLogs: state.drinkLogs.filter((log) => log.id !== id),
    })),

  getDrinkLogsByEvent: (eventId) =>
    get().drinkLogs.filter((log) => log.eventId === eventId),

  getDrinkLogsByUser: (userId, eventId) =>
    get().drinkLogs.filter(
      (log) => log.userId === userId && (!eventId || log.eventId === eventId)
    ),

  getTodayDrinkLogs: (userId) => {
    // Supabaseから取得したデータを優先
    const { todayLogs } = get();
    if (todayLogs.length > 0) {
      return todayLogs.filter((log) => log.userId === userId);
    }

    // フォールバック: ローカルデータ
    const today = new Date().toISOString().split('T')[0];
    return get().drinkLogs.filter(
      (log) =>
        log.userId === userId && log.recordedAt.startsWith(today) && !log.eventId
    );
  },

  addMemo: (memo) => set((state) => ({ memos: [...state.memos, memo] })),

  getMemosByEvent: (eventId) =>
    get().memos.filter((memo) => memo.eventId === eventId),

  getDefaultDrinkById: (id) =>
    get().defaultDrinks.find((drink) => drink.id === id),

  searchDefaultDrinks: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().defaultDrinks.filter((drink) =>
      drink.name.toLowerCase().includes(lowerQuery)
    );
  },
}));
