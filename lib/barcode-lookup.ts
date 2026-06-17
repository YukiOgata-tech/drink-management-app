import { getProductByBarcode } from './products';
import { fetchProductFromYahoo } from './yahoo-shopping';
import { fetchProductByBarcode, OpenFoodFactsResponse } from './openfoodfacts';

/**
 * バーコード（JANコード）から商品情報を解決する統合ロジック。
 *
 * 検索順（フォールバック）:
 *   1. ローカル公式DB（public.products / jan_code 一致）… ml・abv 込みで最も正確
 *   2. Yahoo!ショッピング 商品検索API … 日本の商品を幅広くカバー（ml/abv は未取得）
 *   3. Open Food Facts … 海外商品の補完
 *   いずれも見つからなければ notFound（→ カスタムドリンク登録へ誘導）
 *
 * 戻り値は OpenFoodFactsResponse 形に統一（barcode-scan.tsx がそのまま扱える）。
 */
export async function lookupProductByBarcode(
  barcode: string
): Promise<OpenFoodFactsResponse> {
  // 1. ローカル公式DB（ml・abv が揃っているので最優先）
  const local = await getProductByBarcode(barcode);
  if (local.product) {
    const p = local.product;
    return {
      product: {
        barcode,
        name: p.name,
        brand: p.brand,
        quantity: undefined,
        ml: p.ml ?? null,
        abv: p.abv ?? null,
        imageUrl: undefined,
        category: p.category,
      },
      error: null,
      notFound: false,
    };
  }

  // 2. Yahoo!ショッピング（appid 未設定時は内部で notFound を返す）
  const yahoo = await fetchProductFromYahoo(barcode);
  if (yahoo.product) return yahoo;
  // Yahooが「APIエラー」を返した場合でも、致命的ではないので OFF へフォールバック

  // 3. Open Food Facts
  const off = await fetchProductByBarcode(barcode);
  if (off.product) return off;

  // 4. どこにも無い → notFound（OFF/Yahooの実エラーがあれば優先表示）
  if (off.error) return off;
  if (yahoo.error) return yahoo;
  return { product: null, error: null, notFound: true };
}
