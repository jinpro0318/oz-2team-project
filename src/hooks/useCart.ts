"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCartItems,
  addCartItem,
  updateCartItemQty,
  removeCartItem,
  clearCart as clearCartService,
} from "@/lib/services/cart";
import { useRequireAuth } from "./useAuth";
import { App } from "antd";
import type { Product, CartItem } from "@/types";

export function useCart() {
  const { user, requireAuth } = useRequireAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const cartQuery = useQuery({
    queryKey: ["cart", userId],
    queryFn: () => getCartItems(userId!),
    enabled: !!userId,
  });

  const items: CartItem[] = cartQuery.data ?? [];
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cart", userId] });

  const addMutation = useMutation({
    mutationFn: (params: { product: Product; color: string; size: string; quantity: number }) =>
      addCartItem(userId!, params.product, params.color, params.size, params.quantity),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (params: { itemId: string; quantity: number }) =>
      updateCartItemQty(userId!, params.itemId, params.quantity),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeCartItem(userId!, itemId),
    onSuccess: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: () => clearCartService(userId!),
    onSuccess: invalidate,
  });

  const addToCart = (product: Product, color: string, size: string, quantity = 1) => {
    requireAuth(() => {
      addMutation.mutate({ product, color, size, quantity });
      message.success("장바구니에 담았습니다");
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    updateMutation.mutate({ itemId, quantity });
  };

  const removeItem = (itemId: string) => {
    removeMutation.mutate(itemId);
  };

  const clearCart = () => {
    clearMutation.mutate();
  };

  return {
    items,
    totalCount,
    totalAmount,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    isLoading: cartQuery.isLoading,
  };
}
