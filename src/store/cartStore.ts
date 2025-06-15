import { create } from 'zustand';
import { supabase, CartItem } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface CartState {
  items: CartItem[];
  loading: boolean;
  
  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, variantId?: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    const { profile } = useAuthStore.getState();
    if (!profile) return;

    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(*),
          variant:product_variants(*)
        `)
        .eq('user_id', profile.id);

      if (error) throw error;
      set({ items: data || [] });
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  addToCart: async (productId, variantId, quantity = 1) => {
    const { profile } = useAuthStore.getState();
    if (!profile) return;

    try {
      // Check if item already exists in cart
      const { data: existingItems } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', profile.id)
        .eq('product_id', productId)
        .eq('variant_id', variantId || null);

      if (existingItems && existingItems.length > 0) {
        // Update quantity
        const newQuantity = existingItems[0].quantity + quantity;
        await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItems[0].id);
      } else {
        // Add new item
        await supabase
          .from('cart_items')
          .insert({
            user_id: profile.id,
            product_id: productId,
            variant_id: variantId,
            quantity
          });
      }

      await get().fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      if (quantity <= 0) {
        await get().removeFromCart(itemId);
        return;
      }

      await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      await get().fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  },

  removeFromCart: async (itemId) => {
    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      set({ items: get().items.filter(item => item.id !== itemId) });
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  },

  clearCart: async () => {
    const { profile } = useAuthStore.getState();
    if (!profile) return;

    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', profile.id);

      set({ items: [] });
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  },

  getCartTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      const price = item.product?.price || 0;
      const adjustment = item.variant?.price_adjustment || 0;
      return total + ((price + adjustment) * item.quantity);
    }, 0);
  },

  getCartCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  }
}));