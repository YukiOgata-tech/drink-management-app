import { create } from 'zustand';
import { CustomDrink } from '@/types';
import {
  getCustomDrinks,
  addCustomDrink as addCustomDrinkStorage,
  updateCustomDrink as updateCustomDrinkStorage,
  deleteCustomDrink as deleteCustomDrinkStorage,
  getCustomDrinkById as getCustomDrinkByIdStorage,
} from '@/lib/storage/customDrinks';

interface CustomDrinksState {
  drinks: CustomDrink[];
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  loadDrinks: () => Promise<void>;
  addDrink: (drink: CustomDrink) => Promise<void>;
  updateDrink: (id: string, updates: Partial<CustomDrink>) => Promise<void>;
  deleteDrink: (id: string) => Promise<void>;
  getDrinkById: (id: string) => Promise<CustomDrink | null>;
}

export const useCustomDrinksStore = create<CustomDrinksState>((set, get) => ({
  drinks: [],
  isLoaded: false,
  isLoading: false,

  loadDrinks: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const drinks = await getCustomDrinks();
      set({ drinks, isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
  },

  addDrink: async (drink) => {
    await addCustomDrinkStorage(drink);
    const drinks = await getCustomDrinks();
    set({ drinks });
  },

  updateDrink: async (id, updates) => {
    await updateCustomDrinkStorage(id, updates);
    const drinks = await getCustomDrinks();
    set({ drinks });
  },

  deleteDrink: async (id) => {
    await deleteCustomDrinkStorage(id);
    const drinks = await getCustomDrinks();
    set({ drinks });
  },

  getDrinkById: async (id) => {
    return getCustomDrinkByIdStorage(id);
  },
}));
