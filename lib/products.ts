import { supabase } from './supabase';
import { Product, DrinkCategory } from '@/types';

export interface ProductsResponse {
  products: Product[];
  error: { message: string } | null;
}

/**
 * すべての商品を取得
 */
export async function getAllProducts(): Promise<ProductsResponse> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_official', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return { products: [], error: { message: error.message } };
    }

    return { products: data || [], error: null };
  } catch (err: any) {
    return { products: [], error: { message: err.message || '商品の取得に失敗しました' } };
  }
}

/**
 * カテゴリー別に商品を取得
 */
export async function getProductsByCategory(category: DrinkCategory): Promise<ProductsResponse> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .eq('is_official', true)
      .order('name', { ascending: true });

    if (error) {
      return { products: [], error: { message: error.message } };
    }

    return { products: data || [], error: null };
  } catch (err: any) {
    return { products: [], error: { message: err.message || '商品の取得に失敗しました' } };
  }
}

/**
 * 商品名で検索
 */
export async function searchProducts(query: string): Promise<ProductsResponse> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_official', true)
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%,manufacturer.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(50);

    if (error) {
      return { products: [], error: { message: error.message } };
    }

    return { products: data || [], error: null };
  } catch (err: any) {
    return { products: [], error: { message: err.message || '商品の検索に失敗しました' } };
  }
}

/**
 * IDで商品を取得
 */
export async function getProductById(id: string): Promise<{
  product: Product | null;
  error: { message: string } | null;
}> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { product: null, error: { message: error.message } };
    }

    return { product: data, error: null };
  } catch (err: any) {
    return { product: null, error: { message: err.message || '商品の取得に失敗しました' } };
  }
}

/**
 * 純アルコール量を計算
 */
export function calculatePureAlcohol(ml: number, abv: number): number {
  // 純アルコール量(g) = 容量(ml) × アルコール度数(%) / 100 × 0.8(アルコール比重)
  return Math.round((ml * (abv / 100) * 0.8) * 10) / 10;
}
