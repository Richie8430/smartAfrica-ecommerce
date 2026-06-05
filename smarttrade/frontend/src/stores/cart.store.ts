import { create } from 'zustand';
import type { Cart, CartItem } from '@/types';

interface CartState {
  items:     CartItem[];
  itemCount: number;
  total:     number;
}

interface CartActions {
  setCart:        (cart: Cart) => void;
  clearCart:      () => void;
  optimisticAdd:  (item: CartItem) => void;
  optimisticRemove: (cartItemId: string) => void;
}

export const useCartStore = create<CartState & CartActions>((set) => ({
  items:     [],
  itemCount: 0,
  total:     0,

  setCart: (cart) =>
    set({ items: cart.items, itemCount: cart.itemCount, total: cart.total }),

  clearCart: () => set({ items: [], itemCount: 0, total: 0 }),

  optimisticAdd: (item) =>
    set((s) => {
      const exists = s.items.find((i) => i.product_id === item.product_id);
      const items  = exists
        ? s.items.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          )
        : [...s.items, item];
      const total = items.reduce(
        (sum, i) => sum + Number(i.product.price) * i.quantity,
        0,
      );
      return { items, itemCount: items.reduce((n, i) => n + i.quantity, 0), total };
    }),

  optimisticRemove: (cartItemId) =>
    set((s) => {
      const items  = s.items.filter((i) => i.cart_item_id !== cartItemId);
      const total  = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
      return { items, itemCount: items.reduce((n, i) => n + i.quantity, 0), total };
    }),
}));
