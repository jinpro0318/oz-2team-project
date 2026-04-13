"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  DashboardOutlined,
  ShoppingOutlined,
  OrderedListOutlined,
  TeamOutlined,
  BarChartOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { Badge } from "antd";

const menuItems = [
  { key: "/admin", icon: <DashboardOutlined />, label: "대시보드" },
  { key: "/admin/orders", icon: <OrderedListOutlined />, label: "주문 관리", badge: 12 },
  { key: "/admin/products", icon: <ShoppingOutlined />, label: "상품 관리" },
  { key: "/admin/celebrities", icon: <TeamOutlined />, label: "셀럽 관리" },
  { key: "/admin/analytics", icon: <BarChartOutlined />, label: "매출 분석" },
  { key: "/admin/settlements", icon: <DollarOutlined />, label: "정산 관리" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-dvh w-[220px] flex-col bg-[#1E1E2D] text-white">
      <div className="px-5 py-6">
        <h1 className="text-xl font-bold tracking-tight">C.O.D.E.</h1>
        <p className="text-[10px] text-white/40">Admin Console</p>
      </div>

      <nav className="flex-1 px-3">
        {menuItems.map((item) => {
          const isActive =
            item.key === "/admin" ? pathname === "/admin" : pathname.startsWith(item.key);
          return (
            <button
              key={item.key}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                isActive
                  ? "bg-[#3699FF]/20 font-bold text-[#3699FF]"
                  : "text-white/60 hover:bg-white/5 hover:text-white/80"
              }`}
              onClick={() => router.push(item.key)}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge count={item.badge} size="small" color={isActive ? "#3699FF" : "#7E8299"} />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3699FF] text-xs font-bold">
            A
          </div>
          <div>
            <p className="text-xs font-semibold">관리자</p>
            <p className="text-[10px] text-white/40">admin@code.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
