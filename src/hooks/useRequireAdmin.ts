"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

/**
 * [효진] 어드민 권한 검증 훅
 * - 비로그인: /login?redirect=/admin 으로 리다이렉트
 * - 일반 회원: /feed 로 리다이렉트
 * - 어드민: 통과
 *
 * AdminGuard 컴포넌트는 UI 레벨 가드(스피너 / 403 화면)를 담당하고,
 * 이 훅은 어드민 페이지/액션 내부에서 추가 가드가 필요할 때 사용한다.
 */
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
