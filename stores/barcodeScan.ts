import { create } from 'zustand';
import { DrinkCategory } from '@/types';

/**
 * バーコードスキャン画面 → 記録フォーム間で「読み取った商品」を受け渡すための一時ストア。
 *
 * 以前はナビゲーションのパラメータ（barcodeProduct）で渡していたが、その方式だと
 * フォーム画面の上にバーコード画面が積まれたまま再度フォームへ navigate され、
 * 記録後の router.back() でバーコード結果画面に戻ってしまう問題があった。
 *
 * このストア経由にすることで、バーコード画面は「結果をセットして自分を pop する」
 * だけのピッカーとして振る舞い、記録後は元の一覧/イベント詳細へきれいに戻れる。
 */
export interface ScannedBarcodeProduct {
  id: string;
  name: string;
  category: DrinkCategory;
  ml: number;
  abv: number;
  pureAlcoholG: number;
  emoji: string;
  barcode: string;
}

interface BarcodeScanState {
  pendingProduct: ScannedBarcodeProduct | null;
  /** バーコード画面で確定した商品をセット */
  setPendingProduct: (product: ScannedBarcodeProduct) => void;
  /** フォーム側で取り出して即クリア（多重反映を防ぐ） */
  consumePendingProduct: () => ScannedBarcodeProduct | null;
  /** 破棄 */
  clearPendingProduct: () => void;
}

export const useBarcodeScanStore = create<BarcodeScanState>((set, get) => ({
  pendingProduct: null,
  setPendingProduct: (product) => set({ pendingProduct: product }),
  consumePendingProduct: () => {
    const product = get().pendingProduct;
    if (product) set({ pendingProduct: null });
    return product;
  },
  clearPendingProduct: () => set({ pendingProduct: null }),
}));
