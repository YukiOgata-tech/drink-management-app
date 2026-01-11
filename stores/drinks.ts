import { create } from 'zustand';
import { DrinkLog, DefaultDrink, Memo } from '@/types';
import { dummyDrinkLogs, dummyMemos } from '@/data/dummy_data';
import defaultDrinksData from '@/data/default_drinks.json';

interface DrinksState {
  drinkLogs: DrinkLog[];
  memos: Memo[];
  defaultDrinks: DefaultDrink[];
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
  memos: dummyMemos,
  defaultDrinks: defaultDrinksData as DefaultDrink[],

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
