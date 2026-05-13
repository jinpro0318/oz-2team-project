"use client";

import { Home, Search, Star, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, requireAuth } = useRequireAuth();
  const { user: authUser } = useAuthStore();
  const isBottomNavVisible = useUIStore((s) => s.isBottomNavVisible);
  const hasNewWishlistItem = useUIStore((s) => s.hasNewWishlistItem);

  if (
    pathname?.startsWith("/admin") ||
    pathname?.endsWith("/confirm") ||
    pathname?.endsWith("/cancel") ||
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
