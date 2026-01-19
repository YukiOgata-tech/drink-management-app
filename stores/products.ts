import { create } from 'zustand';
import { Product, DrinkCategory } from '@/types';
import {
  getAllProducts,
  getProductsByCategory,
  searchProducts,
} from '@/lib/products';

interface ProductsState {
  products: Product[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProducts: () => Promise<void>;
  fetchProductsByCategory: (category: DrinkCategory) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  getProductById: (id: string) => Product | null;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    const { products, error } = await getAllProducts();

    if (error) {
      set({ isLoading: false, error: error.message });
    } else {
      set({ products, isLoading: false, error: null });
    }
  },

  fetchProductsByCategory: async (category) => {
    set({ isLoading: true, error: null });
    const { products, error } = await getProductsByCategory(category);

    if (error) {
      set({ isLoading: false, error: error.message });
    } else {
      set({ products, isLoading: false, error: null });
    }
  },

  searchProducts: async (query) => {
    set({ isLoading: true, error: null });
    const { products, error } = await searchProducts(query);

    if (error) {
      set({ isLoading: false, error: error.message });
    } else {
      set({ products, isLoading: false, error: null });
    }
  },

  getProductById: (id) => {
    const { products } = get();
    return products.find((p) => p.id === id) || null;
  },
}));
