import { customDrinksStorage } from './index';
import { CustomDrink } from '@/types';

const CUSTOM_DRINKS_KEY = 'custom_drinks';

/**
 * すべてのカスタムドリンクを取得
 */
export async function getCustomDrinks(): Promise<CustomDrink[]> {
  try {
    const json = await customDrinksStorage.getString(CUSTOM_DRINKS_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error('Error getting custom drinks:', error);
    return [];
  }
}

/**
 * カスタムドリンクを追加
 */
export async function addCustomDrink(drink: CustomDrink): Promise<void> {
  try {
    const drinks = await getCustomDrinks();
    drinks.push(drink);
    await customDrinksStorage.set(CUSTOM_DRINKS_KEY, JSON.stringify(drinks));
  } catch (error) {
    console.error('Error adding custom drink:', error);
    throw error;
  }
}

/**
 * カスタムドリンクを更新
 */
export async function updateCustomDrink(id: string, updates: Partial<CustomDrink>): Promise<void> {
  try {
    const drinks = await getCustomDrinks();
    const index = drinks.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error('Custom drink not found');
    }
    drinks[index] = { ...drinks[index], ...updates };
    await customDrinksStorage.set(CUSTOM_DRINKS_KEY, JSON.stringify(drinks));
  } catch (error) {
    console.error('Error updating custom drink:', error);
    throw error;
  }
}

/**
 * カスタムドリンクを削除
 */
export async function deleteCustomDrink(id: string): Promise<void> {
  try {
    const drinks = await getCustomDrinks();
    const filtered = drinks.filter((d) => d.id !== id);
    await customDrinksStorage.set(CUSTOM_DRINKS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting custom drink:', error);
    throw error;
  }
}

/**
 * IDでカスタムドリンクを取得
 */
export async function getCustomDrinkById(id: string): Promise<CustomDrink | null> {
  try {
    const drinks = await getCustomDrinks();
    return drinks.find((d) => d.id === id) || null;
  } catch (error) {
    console.error('Error getting custom drink by id:', error);
    return null;
  }
}
