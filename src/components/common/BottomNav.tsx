"use client";

import { Home, Search, ShoppingCart, Star, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, requireAuth } = useRequireAuth();
  const { user: authUser } = useAuthStore();
  const isBottomNavVisible = useUIStore((s) => s.isBottomNavVisible);
  const hasNewWishlistItem = useUIStore((s) => s.hasNewWishlistItem);

  const cartCount = useCartStore((s) => s.getTotalCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (
    pathname?.startsWith("/admin") ||
    !isBottomNavVisible
  )
    return null;

  const isActive = (path: string) => pathname === path;

  return (
    <nav
      className="sticky bottom-0 w-[calc(100%+2px)] -ml-[1px] bg-white border-t z-50 flex items-center h-[49px]"
      style={{ borderColor: "#DBDBDB" }}
    >
      {/* 홈 */}
      <Link
        href="/feed"
        className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity"
        aria-label="홈"
      >
        <Home
          className="w-[23px] h-[23px] text-text"
          strokeWidth={isActive("/feed") ? 2.5 : 1.8}
        />
      </Link>

      {/* 검색 */}
      <Link
        href="/search"
        className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity"
        aria-label="검색"
      >
        <Search
          className="w-[23px] h-[23px] text-text"
          strokeWidth={isActive("/search") ? 2.5 : 1.8}
        />
      </Link>

      {/* 찜 */}
      <button
        onClick={() => requireAuth(() => router.push("/wishlist"))}
        className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity relative"
        aria-label="찜목록"
      >
        <Star
          className="w-[23px] h-[23px] text-text"
          fill={isActive("/wishlist") ? "currentColor" : "none"}
          strokeWidth={isActive("/wishlist") ? 2.5 : 1.8}
        />
        {hasNewWishlistItem && (
          <span className="absolute top-2.5 right-[calc(50%-10px)] w-[7px] h-[7px] rounded-full bg-red border-[1.5px] border-white" />
        )}
      </button>

      {/* 장바구니 */}
      <button
        onClick={() => requireAuth(() => router.push("/cart"))}
        className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity relative"
        aria-label="장바구니"
      >
        <ShoppingCart
          className="w-[23px] h-[23px] text-text"
          strokeWidth={isActive("/cart") ? 2.5 : 1.8}
        />
        {mounted && authUser && cartCount > 0 && (
          <span className="absolute top-1.5 right-[calc(50%-16px)] min-w-[16px] h-[16px] rounded-full bg-red px-1 text-[10px] font-bold text-white flex items-center justify-center border-[1.5px] border-white">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </button>

      {/* 마이페이지 */}
      <button
        onClick={() => requireAuth(() => router.push("/mypage"))}
        className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity"
        aria-label="마이페이지"
      >
        {authUser ? (
          <div
            className={`w-[26px] h-[26px] rounded-full overflow-hidden flex items-center justify-center ${
              isActive("/mypage") ? "ring-[1.5px] ring-text" : ""
            }`}
          >
            {authUser.photoUrl ? (
              <img
                src={authUser.photoUrl}
                alt={authUser.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-[10px] font-bold text-white">
                {authUser.nickname?.[0] ?? "U"}
              </div>
            )}
          </div>
        ) : (
          <User
            className="w-[23px] h-[23px] text-text"
            strokeWidth={isActive("/mypage") ? 2.5 : 1.8}
          />
        )}
      </button>
    </nav>
  );
}
