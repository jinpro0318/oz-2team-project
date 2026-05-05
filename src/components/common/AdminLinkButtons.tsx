"use client";

import { useRouter } from "next/navigation";
import { Settings, Home } from "lucide-react";
import { Tooltip } from "antd";
import { useAuthStore } from "@/stores/authStore";
import { useState, useEffect } from "react";

interface AdminLinkButtonsProps {
  variant?: "mall" | "admin";
}

export default function AdminLinkButtons({ variant = "mall" }: AdminLinkButtonsProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || user?.role !== "admin") return null;

  const isMall = variant === "mall";

  return (
    <div className={`flex items-center ${isMall ? "gap-2" : "gap-4"}`}>
      {/* 관리자 페이지에서만 보이는 '쇼핑몰 가기' */}
      {!isMall && (
        <Tooltip title="쇼핑몰 가기" placement="bottom">
          <button
            className="flex items-center gap-1.5 transition-opacity hover:opacity-60 text-xs text-[#7E8299] hover:text-[#3699FF]"
            onClick={() => router.push("/feed")}
          >
            <Home className="w-4 h-4" strokeWidth={2} />
            <span>쇼핑몰 가기</span>
          </button>
        </Tooltip>
      )}

      {/* 쇼핑몰 페이지에서만 보이는 '관리자 페이지' */}
      {isMall && (
        <Tooltip title="관리자 페이지" placement="bottom">
          <button
            className="flex items-center gap-1.5 transition-opacity hover:opacity-60 p-1 rounded-full bg-blue-50 text-blue-500"
            onClick={() => router.push("/admin")}
          >
            <Settings className="w-5 h-5" strokeWidth={2} />
          </button>
        </Tooltip>
      )}
      
      {!isMall && <div className="h-5 w-px bg-[#E4E6EF]" />}
    </div>
  );
}

