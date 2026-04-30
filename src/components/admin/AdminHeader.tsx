"use client";

import { usePathname, useRouter } from "next/navigation";
import { Badge } from "antd";
import { BellOutlined, LogoutOutlined, ShopOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/lib/auth";
import { useAllOrders } from "@/hooks/useOrders"; // [효진] 실시간 미처리 주문 수 계산용으로 추가

// [효진] pathname → 한글 페이지명 매핑 (브레드크럼에 표시)
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

  const pageTitle = pageLabels[pathname] ?? "어드민"; // [효진] 브레드크럼: "Admin / {페이지명}"
  // [효진] 결제완료·준비중 주문만 카운트 → 벨 배지에 표시 (기존: 하드코딩 3)
  const pendingCount = orders.filter(
    (o) => o.status === "payment_complete" || o.status === "preparing"
  ).length;

  // [효진] 로그아웃 버튼 신규 추가: logoutUser() → authStore 초기화 → /login 이동
  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4E6EF] bg-white px-6">
      {/* [효진] 브레드크럼 네비게이션 추가 (기존: 검색창만 있었음) */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-[#7E8299]">Admin</span>
        <span className="text-[#7E8299]">/</span>
        <span className="font-semibold text-[#181C32]">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* [효진] 벨 클릭 시 /admin/orders로 이동 연결 */}
        <Badge count={pendingCount} size="small" color="#F64E60">
          <button
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#7E8299] transition-colors hover:bg-[#F5F6FA] hover:text-[#181C32]"
            onClick={() => router.push("/admin/orders")}
            title="주문 알림"
          >
            <BellOutlined className="text-lg" />
          </button>
        </Badge>

        {/* [효진] 쇼핑몰 사이트로 바로가기 버튼 추가 */}
        <button
          className="flex items-center gap-1.5 text-xs text-[#7E8299] transition-colors hover:text-[#3699FF]"
          onClick={() => router.push("/feed")}
          title="쇼핑몰 메인으로 이동"
        >
          <ShopOutlined />
          <span>쇼핑몰 가기</span>
        </button>

        <div className="h-5 w-px bg-[#E4E6EF]" />

        {/* [효진] 로그아웃 버튼 추가 */}
        <button
          className="flex items-center gap-1.5 text-xs text-[#7E8299] transition-colors hover:text-[#181C32]"
          onClick={handleLogout}
        >
          <LogoutOutlined />
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  );
}
