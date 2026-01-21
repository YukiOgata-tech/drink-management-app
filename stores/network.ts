import { create } from 'zustand';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isInitialized: boolean;

  // Actions
  initialize: () => () => void;
  checkConnection: () => Promise<boolean>;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true,
  isInternetReachable: null,
  connectionType: null,
  isInitialized: false,

  initialize: () => {
    // 現在の状態を取得
    NetInfo.fetch().then((state) => {
      set({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        isInitialized: true,
      });
    });

    // 変更をリッスン
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = get().isConnected;
      const isNowConnected = state.isConnected ?? false;

      set({
        isConnected: isNowConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });

      // オフライン → オンライン に変わった時
      if (!wasConnected && isNowConnected) {
        console.log('[Network] Connection restored - triggering sync');
        // 同期トリガーは別のところで処理
      }
    });

    return unsubscribe;
  },

  checkConnection: async () => {
    const state = await NetInfo.fetch();
    const isConnected = state.isConnected ?? false;
    set({
      isConnected,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.type,
    });
    return isConnected;
  },
}));
