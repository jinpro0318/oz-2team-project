import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (product: Product, color: string, size: string, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getTotalCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, color, size, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find(
          (item) =>
            item.productId === product.id && item.color === color && item.size === size
        );

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          const newItem: CartItem = {
            id: `${product.id}-${color}-${size}-${Date.now()}`,
            productId: product.id,
            product,
            color,
            size,
            quantity,
          };
          set({ items: [...items, newItem] });
        }
      },

      removeItem: (itemId) => {
        set({ items: get().items.filter((item) => item.id !== itemId) });
      },

      updateQuantity: (itemId, quantity) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      },

      getTotalCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "cart-storage",
    }
  )
);
