"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart } from "lucide-react";
import { Badge } from "antd";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useState, useEffect } from "react";
import AdminLinkButtons from "./AdminLinkButtons";

export default function TopBar() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const totalCount = useCartStore((s) => s.getTotalCount());
  const { user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-11 items-center justify-between border-b border-border-light bg-surface px-3">
      <Link
        href="/feed"
        className="text-[21px] font-bold tracking-[-1.5px] no-underline hover:opacity-80 transition-opacity duration-300"
        style={{ color: "#000000" }}
      >
        C.O.D.E.
      </Link>

      <div className="flex items-center gap-3.5">
        <AdminLinkButtons variant="mall" />

        <button
          className="hover:opacity-60 transition-opacity"
          onClick={() => router.push("/search")}
          aria-label="검색"
        >
          <Search className="w-[22px] h-[22px] text-text" strokeWidth={1.8} />
        </button>

        <button
          className="hover:opacity-60 transition-opacity"
          onClick={() => router.push("/cart")}
          aria-label="장바구니"
        >
          <Badge count={mounted ? totalCount : 0} size="small" offset={[-2, 2]}>
            <ShoppingCart className="w-[22px] h-[22px] text-text" strokeWidth={1.8} />
          </Badge>
        </button>

        {mounted && user ? (
          <button
            className="hover:opacity-60 transition-opacity flex items-center"
            onClick={() => router.push("/mypage")}
            aria-label="마이페이지"
          >
            <div className="w-[26px] h-[26px] rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-400">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.nickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-bold text-white">
                  {user.nickname?.[0] ?? "U"}
                </span>
              )}
            </div>
          </button>
        ) : (
          <button
            className="hover:opacity-60 transition-opacity text-[13px] font-semibold text-text"
            onClick={() => router.push("/login")}
            aria-label="로그인"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
