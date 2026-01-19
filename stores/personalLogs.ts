import { create } from 'zustand';
import { PersonalDrinkLog } from '@/types';
import {
  getPersonalLogs,
  addPersonalLog as addPersonalLogStorage,
  updatePersonalLog as updatePersonalLogStorage,
  deletePersonalLog as deletePersonalLogStorage,
  getTodayPersonalLogs,
  getPersonalLogsByDateRange,
} from '@/lib/storage/personalLogs';

interface PersonalLogsState {
  logs: PersonalDrinkLog[];
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  loadLogs: () => Promise<void>;
  addLog: (log: PersonalDrinkLog) => Promise<void>;
  updateLog: (id: string, updates: Partial<PersonalDrinkLog>) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  getTodayLogs: () => Promise<PersonalDrinkLog[]>;
  getLogsByDateRange: (startDate: string, endDate: string) => Promise<PersonalDrinkLog[]>;
}

export const usePersonalLogsStore = create<PersonalLogsState>((set, get) => ({
  logs: [],
  isLoaded: false,
  isLoading: false,

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

  addLog: async (log) => {
    await addPersonalLogStorage(log);
    const logs = await getPersonalLogs();
    set({ logs });
  },

  updateLog: async (id, updates) => {
    await updatePersonalLogStorage(id, updates);
    const logs = await getPersonalLogs();
    set({ logs });
  },

  deleteLog: async (id) => {
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
}));
