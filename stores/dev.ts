import { create } from 'zustand';

interface DevState {
  isDummyDataEnabled: boolean;
  toggleDummyData: () => void;
}

export const useDevStore = create<DevState>((set) => ({
  isDummyDataEnabled: false,
  toggleDummyData: () => set((state) => ({ isDummyDataEnabled: !state.isDummyDataEnabled })),
}));
