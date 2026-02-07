import { DrinkCategory } from '@/types';

/**
 * Open Food Facts API クライアント
 * https://world.openfoodfacts.org/
 */

export interface OpenFoodFactsProduct {
  barcode: string;
  name: string;
  brand?: string;
  quantity?: string;
  ml: number | null;
  abv: number | null;
  imageUrl?: string;
  category: DrinkCategory;
}

export interface OpenFoodFactsResponse {
  product: OpenFoodFactsProduct | null;
  error: { message: string } | null;
  notFound: boolean;
}

// カテゴリを推測するためのキーワードマッピング
const CATEGORY_KEYWORDS: { keywords: string[]; category: DrinkCategory }[] = [
  { keywords: ['ビール', 'beer', 'lager', 'ale', 'pilsner'], category: 'beer' },
  { keywords: ['ハイボール', 'highball', 'ウイスキー', 'whisky', 'whiskey'], category: 'highball' },
  { keywords: ['チューハイ', 'サワー', 'chuhai', 'sour', 'ほろよい', '氷結', 'ストロング'], category: 'chuhai_sour' },
  { keywords: ['焼酎', 'shochu'], category: 'shochu' },
  { keywords: ['日本酒', 'sake', '清酒', '純米'], category: 'sake' },
  { keywords: ['ワイン', 'wine', 'シャルドネ', 'カベルネ', 'メルロー'], category: 'wine' },
  { keywords: ['カクテル', 'cocktail', 'リキュール', 'liqueur'], category: 'cocktail' },
  { keywords: ['梅酒', '果実酒', 'fruit'], category: 'fruit_liquor' },
];

/**
 * 商品名からカテゴリを推測
 */
function guessCategory(name: string, brand?: string): DrinkCategory {
  const searchText = `${name} ${brand || ''}`.toLowerCase();

  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return 'other';
}

/**
 * 容量文字列をmlに変換
 * "350 ml", "350ml", "35cl" などを処理
 */
function parseQuantity(quantity?: string): number | null {
  if (!quantity) return null;

  // ml を抽出
  const mlMatch = quantity.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (mlMatch) {
    return Math.round(parseFloat(mlMatch[1]));
  }

  // cl を抽出して ml に変換
  const clMatch = quantity.match(/(\d+(?:\.\d+)?)\s*cl/i);
  if (clMatch) {
    return Math.round(parseFloat(clMatch[1]) * 10);
  }

  // l を抽出して ml に変換
  const lMatch = quantity.match(/(\d+(?:\.\d+)?)\s*l\b/i);
  if (lMatch) {
    return Math.round(parseFloat(lMatch[1]) * 1000);
  }

  return null;
}

/**
 * バーコードで商品を検索
 */
export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsResponse> {
  try {
    // JANコードの正規化（先頭の0を除去しない）
    const normalizedBarcode = barcode.trim();

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${normalizedBarcode}.json`,
      {
        headers: {
          'User-Agent': 'DrinkManagementApp/1.0 (contact@example.com)',
        },
      }
    );

    if (!response.ok) {
      return {
        product: null,
        error: { message: `APIエラー: ${response.status}` },
        notFound: false,
      };
    }

    const data = await response.json();

    // 商品が見つからない場合
    if (data.status !== 1 || !data.product) {
      return {
        product: null,
        error: null,
        notFound: true,
      };
    }

    const p = data.product;

    // 商品名を取得（日本語優先）
    const name = p.product_name_ja || p.product_name || p.generic_name || '不明な商品';

    // ブランド名
    const brand = p.brands?.split(',')[0]?.trim();

    // 容量
    const ml = parseQuantity(p.quantity);

    // アルコール度数
    // nutriments.alcohol_100g または nutriments.alcohol_value を使用
    let abv: number | null = null;
    if (p.nutriments) {
      abv = p.nutriments.alcohol_100g ?? p.nutriments.alcohol_value ?? null;
      // 文字列の場合は数値に変換
      if (typeof abv === 'string') {
        abv = parseFloat(abv);
        if (isNaN(abv)) abv = null;
      }
    }

    // カテゴリを推測
    const category = guessCategory(name, brand);

    return {
      product: {
        barcode: normalizedBarcode,
        name,
        brand,
        quantity: p.quantity,
        ml,
        abv,
        imageUrl: p.image_url || p.image_front_url,
        category,
      },
      error: null,
      notFound: false,
    };
  } catch (err: any) {
    console.error('Open Food Facts API error:', err);
    return {
      product: null,
      error: { message: err.message || '商品情報の取得に失敗しました' },
      notFound: false,
    };
  }
}

/**
 * バーコードが有効なJANコードかチェック
 */
export function isValidBarcode(barcode: string): boolean {
  // JANコードは8桁または13桁
  const cleaned = barcode.replace(/\D/g, '');
  return cleaned.length === 8 || cleaned.length === 13;
}
