"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
} from "@/lib/services/wishlist";
import { useRequireAuth } from "./useAuth";
import { App } from "antd";
import type { Product, WishlistItem } from "@/types";
import { useUIStore } from "@/stores/uiStore";

export function useWishlist() {
  const { user, requireAuth } = useRequireAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const setHasNewWishlistItem = useUIStore((s) => s.setHasNewWishlistItem);

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: () => getWishlist(userId!),
    enabled: !!userId,
  });

  const items: WishlistItem[] = wishlistQuery.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });

  const addMutation = useMutation({
    mutationFn: (product: Product) => addWishlistItem(userId!, product),
    onSuccess: () => {
      invalidate();
      setHasNewWishlistItem(true);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeWishlistItem(userId!, productId),
    onSuccess: invalidate,
  });

  const toggleWishlist = (product: Product) => {
    requireAuth(() => {
      const isWishlisted = items.some((i) => i.productId === product.id);
      if (isWishlisted) {
        removeMutation.mutate(product.id);
        message.success("찜 목록에서 제거했습니다");
      } else {
        addMutation.mutate(product);
        message.success("찜 목록에 추가했습니다");
      }
    });
  };

  const isWishlisted = (productId: string) => items.some((i) => i.productId === productId);

  return {
    items,
    toggleWishlist,
    isWishlisted,
    isLoading: wishlistQuery.isLoading,
  };
}
