import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  isBottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
  hasNewWishlistItem: boolean;
  setHasNewWishlistItem: (hasNew: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isBottomNavVisible: true,
      setBottomNavVisible: (visible: boolean) => set({ isBottomNavVisible: visible }),
      hasNewWishlistItem: false,
      setHasNewWishlistItem: (hasNew: boolean) => set({ hasNewWishlistItem: hasNew }),
    }),
    {
      name: "ui-storage",
      // isBottomNavVisible은 페이지 진입 시마다 초기화되는 것이 좋으므로 영구 저장에서 제외
      partialize: (state) => ({ hasNewWishlistItem: state.hasNewWishlistItem }),
    }
  )
);
