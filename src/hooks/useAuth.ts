"use client";

import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useRequireAuth() {
  const { user, showLoginPrompt, setShowLoginPrompt } = useAuthStore();
  const router = useRouter();

  const requireAuth = useCallback(
    (callback?: () => void) => {
      if (!user) {
        setShowLoginPrompt(true);
        return false;
      }
      callback?.();
      return true;
    },
    [user, setShowLoginPrompt]
  );

  return { user, requireAuth, isLoggedIn: !!user };
}
