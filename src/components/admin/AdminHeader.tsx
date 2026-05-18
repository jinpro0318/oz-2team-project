"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "antd";
import { BellOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/lib/auth";
import { useAllOrders } from "@/hooks/useOrders";
import AdminLinkButtons from "@/components/common/AdminLinkButtons";

const pageLabels: Record<string, string> = {
  "/admin": "대시보드",
  "/admin/orders": "주문 관리",
  "/admin/products": "상품 관리",
  "/admin/celebrities": "셀럽 관리",
  "/admin/analytics": "매출 분석",
  "/admin/settlements": "정산 관리",
  "/admin/exchanges": "교환/반품 관리",
};

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { data: orders = [] } = useAllOrders();

  const pageTitle = pageLabels[pathname] ?? "어드민";
  const pendingCount = orders.filter(
    (o) => o.status === "payment_complete" || o.status === "preparing"
  ).length;

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4E6EF] bg-white px-6">
        
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-[#7E8299]">Admin</span>
          <span className="text-[#7E8299]">/</span>
          <span className="font-semibold text-[#181C32]">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-4">
          <Badge count={pendingCount} size="small" color="#F64E60">
            <button
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#7E8299] transition-colors hover:bg-[#F5F6FA] hover:text-[#181C32]"
              onClick={() => router.push("/admin/orders")}
              title="주문 알림"
            >
              <BellOutlined className="text-lg" />
            </button>
          </Badge>

          <AdminLinkButtons variant="admin" />

          <button
            className="flex items-center gap-1.5 text-xs text-[#7E8299] transition-colors hover:text-[#181C32]"
            onClick={handleLogout}
          >
            <LogoutOutlined />
            <span>로그아웃</span>
          </button>
        </div>
      </header>
    </>
  );
}
