"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, MessageCircle, ShoppingCart, Settings } from "lucide-react";
import { Badge, Tooltip } from "antd";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/hooks/useAuth";

export default function TopBar() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const totalCount = useCartStore((s) => s.getTotalCount());
  const { requireAuth } = useRequireAuth();
  const { user } = useAuthStore(); // [효진] 관리자 여부 확인용

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-11 items-center justify-between border-b border-border-light bg-surface px-3">
      <Link 
        href="/feed" 
        className="text-[21px] font-bold tracking-[-1.5px] text-text no-underline"
      >
        C.O.D.E.
      </Link>
      <div className="flex items-center gap-4">
        {/* [효진] 관리자 계정일 때만 어드민 페이지 바로가기 아이콘 표시 */}
        {mounted && user?.role === "admin" && (
          <Tooltip title="관리자 페이지" placement="bottom">
            <button
              className="hover:opacity-60 transition-opacity p-1 rounded-full bg-blue-50"
              onClick={() => router.push("/admin")}
            >
              <Settings className="w-5 h-5 text-blue-500" strokeWidth={2} />
            </button>
          </Tooltip>
        )}

        <button 
          className="hover:opacity-60 transition-opacity relative"
          onClick={() => requireAuth(() => router.push("/wishlist"))}
        >
          <Star className="w-[22px] h-[22px] text-text" strokeWidth={1.8} />
          <span className="absolute top-0 right-0 w-[7px] h-[7px] rounded-full bg-red border-[1.5px] border-surface" />
        </button>
        
        <button 
          className="hover:opacity-60 transition-opacity"
          onClick={() => router.push("/cart")}
        >
          <Badge count={mounted ? totalCount : 0} size="small" offset={[-2, 2]} className="text-text">
            <ShoppingCart className="w-[22px] h-[22px] text-text" strokeWidth={1.8} />
          </Badge>
        </button>

        <button className="hover:opacity-60 transition-opacity">
          <MessageCircle className="w-[22px] h-[22px] text-text" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
