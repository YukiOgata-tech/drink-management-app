import { guessCategory, parseQuantity, OpenFoodFactsResponse } from './openfoodfacts';

/**
 * Yahoo!ショッピング 商品検索API(v3) クライアント
 * https://developer.yahoo.co.jp/webapi/shopping/v3/itemsearch.html
 *
 * JANコードで直接検索できる（jan_code パラメータ）。Client ID(appid) のみで動作し、
 * IP制限などの設定は不要。商品名・ブランド・画像を取得する。
 * ml / アルコール度数(abv) は返らないため、呼び出し側でユーザー確認入力させる。
 *
 * 戻り値は Open Food Facts と同じ OpenFoodFactsResponse 形に揃える。
 */

const YAHOO_ENDPOINT =
  'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';

/**
 * Yahoo appid(Client ID) が設定されているか
 */
export function isYahooConfigured(): boolean {
  return !!process.env.EXPO_PUBLIC_YAHOO_APP_ID;
}

/**
 * バーコード（JANコード）でYahoo!ショッピングを検索
 */
export async function fetchProductFromYahoo(
  barcode: string
): Promise<OpenFoodFactsResponse> {
  const appId = process.env.EXPO_PUBLIC_YAHOO_APP_ID;

  // 未設定なら「未対応」として notFound 扱い（エラーにはしない）
  if (!appId) {
    return { product: null, error: null, notFound: true };
  }

  try {
    const normalizedBarcode = barcode.trim();
    const params = new URLSearchParams({
      appid: appId,
      jan_code: normalizedBarcode,
      results: '1',
    });

    const response = await fetch(`${YAHOO_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
      // 該当なし系は「未登録」扱い、それ以外はエラー表示
      if (response.status === 404) {
        return { product: null, error: null, notFound: true };
      }
      return {
        product: null,
        error: { message: `Yahoo APIエラー: ${response.status}` },
        notFound: false,
      };
    }

    const data = await response.json();
    const hits: any[] = data.hits || [];

    if (hits.length === 0) {
      return { product: null, error: null, notFound: true };
    }

    const hit = hits[0];
    const name: string = hit.name || '不明な商品';
    const brand: string | undefined = hit.brand?.name || undefined;
    const imageUrl: string | undefined = hit.image?.medium || hit.image?.small;

    // 商品名から容量を推測（Yahooはml/abvを返さない）
    const ml = parseQuantity(name);
    const category = guessCategory(name, brand);

    return {
      product: {
        barcode: normalizedBarcode,
        name,
        brand,
        quantity: undefined,
        ml,
        abv: null,
        imageUrl,
        category,
      },
      error: null,
      notFound: false,
    };
  } catch (err: any) {
    console.error('Yahoo Shopping API error:', err);
    return {
      product: null,
      error: { message: err.message || '商品情報の取得に失敗しました' },
      notFound: false,
    };
  }
}
