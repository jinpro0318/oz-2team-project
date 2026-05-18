"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useState, useEffect } from "react";
import AdminLinkButtons from "./AdminLinkButtons";
import BrandLogo from "./BrandLogo";

export default function TopBar() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-11 items-center justify-between border-b border-border-light bg-surface px-3">
      <Link
        href="/feed"
        className="no-underline hover:opacity-80 transition-opacity duration-300"
      >
        <BrandLogo size={21} tracking={-1.5} weight="bold" />
      </Link>

      <div className="flex items-center gap-3.5">
        <AdminLinkButtons variant="mall" />

        
        {mounted && !user && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <button
              className="text-text hover:opacity-60 transition-opacity"
              onClick={() => router.push("/login")}
              aria-label="로그인"
            >
              로그인
            </button>
            <span className="text-text-muted">|</span>
            <button
              className="text-text hover:opacity-60 transition-opacity"
              onClick={() => router.push("/register")}
              aria-label="회원가입"
            >
              회원가입
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
