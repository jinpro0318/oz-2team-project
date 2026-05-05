"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { useUIStore } from "@/stores/uiStore";

/**
 * 전역 "떠 있는 모바일 폰" 효과를 주는 레이아웃 래퍼
 * 관리자 페이지를 제외한 모든 쇼핑몰 페이지에 적용됩니다.
 */
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBottomNavVisible = useUIStore((s) => s.isBottomNavVisible);

  // 관리자 페이지(/admin)는 모바일 래퍼를 적용하지 않고 그대로 출력
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  // BottomNav가 표시되는 페이지인지 확인 (BottomNav.tsx와 동일한 로직)
  const showBottomNav = !(
    pathname?.endsWith("/confirm") ||
    pathname?.endsWith("/cancel") ||
    !isBottomNavVisible
  );

  return (
    <div className="min-h-dvh bg-bg">
      {/* 
        Outer: 전체 배경색(bg-bg, 회색)을 깔아줍니다.
        Inner: 최대 너비 390px, 중앙 정렬, 하얀 바탕, 그림자 효과를 적용합니다.
      */}
      <div 
        className="max-w-[390px] mx-auto bg-white min-h-dvh shadow-2xl relative flex flex-col border-x border-border-light"
      >
        {children}
        {/* 하단 바 공간 확보를 위한 물리적 스페이서 */}
        {showBottomNav && <div className="h-[60px] shrink-0" />}
      </div>
    </div>
  );
}
