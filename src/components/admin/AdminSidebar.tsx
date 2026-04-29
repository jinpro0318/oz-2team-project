"use client";

import { usePathname, useRouter } from "next/navigation";
import { Badge } from "antd";
import { useAllOrders } from "@/hooks/useOrders"; // [효진] 실시간 주문 배지 카운트용으로 추가

// [효진] Ant Design icons → 와이어프레임 기반 SVG 아이콘으로 교체
// showBadge: true인 항목(주문 관리)에만 미처리 건수 배지 표시
const menuItems = [
  {
    key: "/admin",
    label: "대시보드",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
      </svg>
    ),
  },
  {
    key: "/admin/orders",
    label: "주문 관리",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18" />
      </svg>
    ),
    showBadge: true, // [효진] 미처리 주문 배지 표시 대상
  },
  {
    key: "/admin/products",
    label: "상품 관리",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
        <path d="M2 3h20v14H2z M8 21h8 M12 17v4" />
      </svg>
    ),
  },
  {
    key: "/admin/celebrities",
    label: "셀럽 관리",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      </svg>
    ),
  },
  {
    key: "/admin/analytics",
    label: "매출 분석",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
        <path d="M18 20V10 M12 20V4 M6 20v-6" />
      </svg>
    ),
  },
  {
    key: "/admin/settlements",
    label: "정산 관리",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
        <path d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: orders = [] } = useAllOrders();

  // [효진] 결제완료+준비중 주문만 카운트 (기존: 하드코딩 숫자 12)
  const pendingOrders = orders.filter(
    (o) => o.status === "payment_complete" || o.status === "preparing"
  ).length;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-dvh w-[220px] flex-col bg-[#1E1E2D] text-white">
      {/* 로고 */}
      <div className="border-b border-white/[0.08] px-4 pb-3.5 pt-[18px]">
        <div className="text-[18px] font-bold tracking-[-1px] text-white">C.O.D.E.</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-white/40">Admin Panel</div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-2.5 py-3">
        {menuItems.map((item) => {
          const isActive =
            item.key === "/admin" ? pathname === "/admin" : pathname.startsWith(item.key);
          return (
            <button
              key={item.key}
              // [효진] 활성 스타일: bg-[#3699FF] (기존: bg-[#3699FF]/20)
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-[#3699FF] text-white"
                  : "text-white/60 hover:bg-white/[0.05] hover:text-white/80"
              }`}
              onClick={() => router.push(item.key)}
            >
              <span className={isActive ? "text-white" : "text-white/50"}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {/* [효진] 미처리 주문 배지: 실시간 pendingOrders 값 표시 */}
              {item.showBadge && pendingOrders > 0 && (
                <span className="flex min-w-[18px] items-center justify-center rounded-full bg-[#F64E60] px-1.5 py-0 text-[10px] font-bold text-white">
                  {pendingOrders}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* [효진] 관리자 정보 영역 추가 */}
      <div className="border-t border-white/[0.08] px-2.5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3699FF] text-[13px] font-bold text-white">
            관
          </div>
          <div>
            <div className="text-[12px] font-semibold text-white/85">관리자</div>
            <div className="text-[10px] text-white/40">Super Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
