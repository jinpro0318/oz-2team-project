"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";


export function useRequireAdmin() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=/admin");
    } else if (user.role !== "admin") {
      router.replace("/feed");
    }
  }, [user, loading, router]);

  return {
    user,
    loading,
    isAdmin: user?.role === "admin",
  };
}
